import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  PlayCircle, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronRight,
  BookOpen,
  Video,
  Pencil
} from "lucide-react";
import { useUserContext } from "@/hooks/useUserContext";
import { coursesService } from "@/services/coursesService";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isVetterAdmin } = useUserContext();
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<string | null>(null);

  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => coursesService.getCourseById(courseId!),
    enabled: !!courseId
  });

  const { data: modules, isLoading: loadingModules } = useQuery({
    queryKey: ['course-modules', courseId],
    queryFn: () => coursesService.getCourseModules(courseId!),
    enabled: !!courseId
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ lessonId, progress, completed }: { lessonId: string; progress: number; completed: boolean }) =>
      coursesService.updateLessonProgress(lessonId, progress, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', courseId] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    }
  });

  const toggleModule = (moduleId: string) => {
    const newOpen = new Set(openModules);
    if (newOpen.has(moduleId)) {
      newOpen.delete(moduleId);
    } else {
      newOpen.add(moduleId);
    }
    setOpenModules(newOpen);
  };

  const markAsComplete = (lessonId: string) => {
    updateProgressMutation.mutate({ lessonId, progress: 100, completed: true });
    toast.success('Aula marcada como concluída!');
  };

  const currentLesson = modules?.flatMap(m => m.lessons || []).find(l => l.id === activeLesson);

  // Calcular progresso total
  const totalLessons = modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;
  const completedLessons = modules?.reduce((acc, m) => 
    acc + (m.lessons?.filter(l => l.user_progress?.completed).length || 0), 0) || 0;
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  if (loadingCourse || loadingModules) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando curso...</p>
        </div>
      </AppLayout>
    );
  }

  if (!course) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Curso não encontrado</p>
          <Button className="mt-4" onClick={() => navigate('/vacademy')}>
            Voltar para cursos
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/vacademy')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <p className="text-muted-foreground">{course.description}</p>
          </div>
          {isVetterAdmin && (
            <Button 
              variant="outline"
              onClick={() => navigate(`/vacademy/${courseId}/editar`)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar Curso
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video/Content Area */}
            {activeLesson && currentLesson ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{currentLesson.title}</span>
                    {!currentLesson.user_progress?.completed && (
                      <Button 
                        size="sm" 
                        onClick={() => markAsComplete(currentLesson.id)}
                        disabled={updateProgressMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Marcar como concluída
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentLesson.video_url ? (
                    <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                      <iframe
                        src={currentLesson.video_url}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                      <Video className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  {currentLesson.description && (
                    <p className="text-muted-foreground mb-4">{currentLesson.description}</p>
                  )}

                  {currentLesson.content_html && (
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: currentLesson.content_html }}
                    />
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <PlayCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Selecione uma aula para começar
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Modules */}
          <div className="space-y-4">
            {/* Progress Card */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progresso do Curso</span>
                  <span className="text-sm text-muted-foreground">
                    {completedLessons}/{totalLessons} aulas
                  </span>
                </div>
                <Progress value={overallProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {overallProgress}% concluído
                </p>
              </CardContent>
            </Card>

            {/* Modules List */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Conteúdo do Curso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {modules && modules.length > 0 ? (
                  modules.map((module) => {
                    const moduleLessons = module.lessons || [];
                    const moduleCompleted = moduleLessons.filter(l => l.user_progress?.completed).length;
                    
                    return (
                      <Collapsible
                        key={module.id}
                        open={openModules.has(module.id)}
                        onOpenChange={() => toggleModule(module.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-between h-auto py-3 px-3"
                          >
                            <div className="flex items-center gap-2 text-left">
                              {openModules.has(module.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <span className="font-medium">{module.title}</span>
                            </div>
                            <Badge variant="secondary" className="ml-2">
                              {moduleCompleted}/{moduleLessons.length}
                            </Badge>
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-6 space-y-1">
                          {moduleLessons.map((lesson) => (
                            <Button
                              key={lesson.id}
                              variant={activeLesson === lesson.id ? "secondary" : "ghost"}
                              className="w-full justify-start h-auto py-2 px-3"
                              onClick={() => setActiveLesson(lesson.id)}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                {lesson.user_progress?.completed ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                ) : (
                                  <PlayCircle className="h-4 w-4 shrink-0" />
                                )}
                                <span className="text-sm truncate">{lesson.title}</span>
                              </div>
                              {lesson.duration_minutes > 0 && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {lesson.duration_minutes}min
                                </span>
                              )}
                            </Button>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum módulo cadastrado
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
