import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  GraduationCap, 
  Clock, 
  BookOpen, 
  Search, 
  Plus,
  PlayCircle,
  CheckCircle2
} from "lucide-react";
import { coursesService, Course } from "@/services/coursesService";
import { useUserRole } from "@/hooks/useUserRole";

const difficultyLabels = {
  beginner: { label: 'Iniciante', color: 'bg-green-100 text-green-800' },
  intermediate: { label: 'Intermediário', color: 'bg-yellow-100 text-yellow-800' },
  advanced: { label: 'Avançado', color: 'bg-red-100 text-red-800' }
};

function CourseCard({ course, onClick }: { course: Course; onClick: () => void }) {
  const difficulty = difficultyLabels[course.difficulty];
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <div className="aspect-video relative overflow-hidden rounded-t-lg">
        {course.thumbnail_url ? (
          <img 
            src={course.thumbnail_url} 
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
            <GraduationCap className="h-12 w-12 text-primary" />
          </div>
        )}
        {!course.is_published && (
          <Badge className="absolute top-2 right-2" variant="secondary">
            Rascunho
          </Badge>
        )}
      </div>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold line-clamp-2">{course.title}</h3>
        </div>
        
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {course.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="outline" className={difficulty.color}>
            {difficulty.label}
          </Badge>
          {course.category && (
            <Badge variant="outline">{course.category}</Badge>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            {course.modules_count || 0} módulos
          </span>
          <span className="flex items-center gap-1">
            <PlayCircle className="h-4 w-4" />
            {course.lessons_count || 0} aulas
          </span>
          {course.duration_hours > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {course.duration_hours}h
            </span>
          )}
        </div>

        {/* Progress */}
        {course.user_progress !== undefined && course.user_progress > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{course.user_progress}%</span>
            </div>
            <Progress value={course.user_progress} className="h-2" />
          </div>
        )}

        {course.user_progress === 100 && (
          <div className="flex items-center gap-1 text-sm text-green-600 mt-2">
            <CheckCircle2 className="h-4 w-4" />
            Concluído
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VAcademy() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<string | null>(null);

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => coursesService.getCourses()
  });

  const filteredCourses = courses?.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase()) ||
                          course.description?.toLowerCase().includes(search.toLowerCase());
    const matchesDifficulty = !filterDifficulty || course.difficulty === filterDifficulty;
    const matchesPublished = isAdmin || course.is_published;
    return matchesSearch && matchesDifficulty && matchesPublished;
  });

  const inProgressCourses = filteredCourses?.filter(c => c.user_progress && c.user_progress > 0 && c.user_progress < 100);
  const completedCourses = filteredCourses?.filter(c => c.user_progress === 100);
  const availableCourses = filteredCourses?.filter(c => !c.user_progress || c.user_progress === 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6" />
              VAcademy
            </h1>
            <p className="text-muted-foreground">Plataforma de capacitação e treinamento</p>
          </div>
          
          {isAdmin && (
            <Button onClick={() => navigate('/vacademy/novo')}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Curso
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cursos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterDifficulty === null ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterDifficulty(null)}
            >
              Todos
            </Button>
            <Button
              variant={filterDifficulty === "beginner" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterDifficulty("beginner")}
            >
              Iniciante
            </Button>
            <Button
              variant={filterDifficulty === "intermediate" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterDifficulty("intermediate")}
            >
              Intermediário
            </Button>
            <Button
              variant={filterDifficulty === "advanced" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterDifficulty("advanced")}
            >
              Avançado
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando cursos...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Em andamento */}
            {inProgressCourses && inProgressCourses.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-primary" />
                  Continue aprendendo
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inProgressCourses.map((course) => (
                    <CourseCard 
                      key={course.id} 
                      course={course}
                      onClick={() => navigate(`/vacademy/${course.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Disponíveis */}
            {availableCourses && availableCourses.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Cursos disponíveis</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableCourses.map((course) => (
                    <CourseCard 
                      key={course.id} 
                      course={course}
                      onClick={() => navigate(`/vacademy/${course.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Concluídos */}
            {completedCourses && completedCourses.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Cursos concluídos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedCourses.map((course) => (
                    <CourseCard 
                      key={course.id} 
                      course={course}
                      onClick={() => navigate(`/vacademy/${course.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {(!filteredCourses || filteredCourses.length === 0) && (
              <Card>
                <CardContent className="text-center py-12">
                  <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {search ? 'Nenhum curso encontrado com esses filtros.' : 'Nenhum curso disponível ainda.'}
                  </p>
                  {isAdmin && !search && (
                    <Button className="mt-4" onClick={() => navigate('/vacademy/novo')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar primeiro curso
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
