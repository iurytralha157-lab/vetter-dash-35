import { supabase } from "@/integrations/supabase/client";

export interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  instructor_id: string | null;
  category: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration_hours: number;
  is_published: boolean;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  // Computed fields
  modules_count?: number;
  lessons_count?: number;
  user_progress?: number;
  instructor?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
  lessons?: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  content_html: string | null;
  duration_minutes: number;
  order_index: number;
  created_at: string;
  user_progress?: {
    completed: boolean;
    progress_percent: number;
  };
}

export interface UserCourseProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  progress_percent: number;
  completed_at: string | null;
}

export const coursesService = {
  async getCourses(): Promise<Course[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!courses) return [];

    // Buscar instrutores separadamente
    const instructorIds = [...new Set(courses.map(c => c.instructor_id).filter(Boolean))] as string[];
    let instructorsMap = new Map<string, { id: string; name: string; avatar_url: string | null }>();
    
    if (instructorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', instructorIds);
      instructorsMap = new Map(profiles?.map(p => [p.id, p]));
    }

    // Buscar contagem de módulos e aulas para cada curso
    const coursesWithCounts = await Promise.all(
      courses.map(async (course) => {
        const { count: modulesCount } = await supabase
          .from('course_modules')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id);

        const { data: modules } = await supabase
          .from('course_modules')
          .select('id')
          .eq('course_id', course.id);

        let lessonsCount = 0;
        let userProgress = 0;

        if (modules && modules.length > 0) {
          const moduleIds = modules.map(m => m.id);
          
          const { count } = await supabase
            .from('course_lessons')
            .select('*', { count: 'exact', head: true })
            .in('module_id', moduleIds);
          
          lessonsCount = count || 0;

          // Calcular progresso do usuário
          if (user && lessonsCount > 0) {
            const { data: lessons } = await supabase
              .from('course_lessons')
              .select('id')
              .in('module_id', moduleIds);

            if (lessons) {
              const lessonIds = lessons.map(l => l.id);
              const { count: completedCount } = await supabase
                .from('user_course_progress')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .in('lesson_id', lessonIds)
                .eq('completed', true);

              userProgress = Math.round(((completedCount || 0) / lessonsCount) * 100);
            }
          }
        }

        return {
          ...course,
          difficulty: course.difficulty as Course['difficulty'],
          modules_count: modulesCount || 0,
          lessons_count: lessonsCount,
          user_progress: userProgress,
          instructor: course.instructor_id ? instructorsMap.get(course.instructor_id) : undefined
        } as Course;
      })
    );

    return coursesWithCounts;
  },

  async getCourseById(courseId: string): Promise<Course | null> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (error) throw error;
    if (!data) return null;

    // Buscar instrutor
    let instructor;
    if (data.instructor_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('id', data.instructor_id)
        .single();
      instructor = profile || undefined;
    }

    return {
      ...data,
      difficulty: data.difficulty as Course['difficulty'],
      instructor
    };
  },

  async getCourseModules(courseId: string): Promise<CourseModule[]> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: modules, error } = await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (error) throw error;
    if (!modules) return [];

    // Buscar aulas para cada módulo
    const modulesWithLessons = await Promise.all(
      modules.map(async (module) => {
        const { data: lessons } = await supabase
          .from('course_lessons')
          .select('*')
          .eq('module_id', module.id)
          .order('order_index', { ascending: true });

        // Buscar progresso do usuário para cada aula
        let lessonsWithProgress = lessons || [];
        if (user && lessons) {
          const lessonIds = lessons.map(l => l.id);
          const { data: progress } = await supabase
            .from('user_course_progress')
            .select('*')
            .eq('user_id', user.id)
            .in('lesson_id', lessonIds);

          const progressMap = new Map(progress?.map(p => [p.lesson_id, p]));
          
          lessonsWithProgress = lessons.map(lesson => ({
            ...lesson,
            user_progress: progressMap.get(lesson.id) ? {
              completed: progressMap.get(lesson.id)!.completed,
              progress_percent: progressMap.get(lesson.id)!.progress_percent
            } : undefined
          }));
        }

        return {
          ...module,
          lessons: lessonsWithProgress
        } as CourseModule;
      })
    );

    return modulesWithLessons;
  },

  async updateLessonProgress(lessonId: string, progressPercent: number, completed: boolean = false): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('user_course_progress')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        progress_percent: progressPercent,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,lesson_id'
      });

    if (error) throw error;
  },

  async createCourse(course: Partial<Course>): Promise<Course> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('courses')
      .insert({
        title: course.title || 'Novo Curso',
        description: course.description,
        thumbnail_url: course.thumbnail_url,
        category: course.category,
        difficulty: course.difficulty || 'beginner',
        duration_hours: course.duration_hours || 0,
        instructor_id: user.id,
        is_published: false
      })
      .select()
      .single();

    if (error) throw error;
    return { ...data, difficulty: data.difficulty as Course['difficulty'] };
  },

  async updateCourse(courseId: string, updates: Partial<Course>): Promise<Course> {
    const { data, error } = await supabase
      .from('courses')
      .update({
        title: updates.title,
        description: updates.description,
        thumbnail_url: updates.thumbnail_url,
        category: updates.category,
        difficulty: updates.difficulty,
        duration_hours: updates.duration_hours,
        is_published: updates.is_published,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .select()
      .single();

    if (error) throw error;
    return { ...data, difficulty: data.difficulty as Course['difficulty'] };
  },

  async createModule(courseId: string, title: string, description?: string): Promise<CourseModule> {
    // Buscar maior order_index
    const { data: existing } = await supabase
      .from('course_modules')
      .select('order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 0;

    const { data, error } = await supabase
      .from('course_modules')
      .insert({
        course_id: courseId,
        title,
        description,
        order_index: nextIndex
      })
      .select()
      .single();

    if (error) throw error;
    return data as CourseModule;
  },

  async createLesson(moduleId: string, lesson: Partial<CourseLesson>): Promise<CourseLesson> {
    // Buscar maior order_index
    const { data: existing } = await supabase
      .from('course_lessons')
      .select('order_index')
      .eq('module_id', moduleId)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 0;

    const { data, error } = await supabase
      .from('course_lessons')
      .insert({
        module_id: moduleId,
        title: lesson.title || 'Nova Aula',
        description: lesson.description,
        video_url: lesson.video_url,
        content_html: lesson.content_html,
        duration_minutes: lesson.duration_minutes || 0,
        order_index: nextIndex
      })
      .select()
      .single();

    if (error) throw error;
    return data as CourseLesson;
  }
};
