import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Save,
  Eye,
  EyeOff,
  GripVertical,
  Pencil
} from "lucide-react";
import { coursesService, Course, CourseModule, CourseLesson } from "@/services/coursesService";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function CourseEditor() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!courseId;

  const [courseData, setCourseData] = useState<Partial<Course>>({
    title: '',
    description: '',
    category: '',
    difficulty: 'beginner',
    duration_hours: 0,
    thumbnail_url: '',
    is_published: false
  });

  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [moduleDialog, setModuleDialog] = useState<{ open: boolean; module?: CourseModule }>({ open: false });
  const [lessonDialog, setLessonDialog] = useState<{ open: boolean; moduleId: string; lesson?: CourseLesson }>({ open: false, moduleId: '' });
  const [moduleForm, setModuleForm] = useState({ title: '', description: '' });
  const [lessonForm, setLessonForm] = useState({ 
    title: '', 
    description: '', 
    video_url: '', 
    content_html: '', 
    duration_minutes: 0 
  });

  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => coursesService.getCourseById(courseId!),
    enabled: isEditing
  });

  const { data: modules, isLoading: loadingModules, refetch: refetchModules } = useQuery({
    queryKey: ['course-modules', courseId],
    queryFn: () => coursesService.getCourseModules(courseId!),
    enabled: isEditing
  });

  useEffect(() => {
    if (course) {
      setCourseData({
        title: course.title,
        description: course.description || '',
        category: course.category || '',
        difficulty: course.difficulty,
        duration_hours: course.duration_hours,
        thumbnail_url: course.thumbnail_url || '',
        is_published: course.is_published
      });
    }
  }, [course]);

  const createCourseMutation = useMutation({
    mutationFn: (data: Partial<Course>) => coursesService.createCourse(data),
    onSuccess: (newCourse) => {
      toast.success('Curso criado com sucesso!');
      navigate(`/vacademy/${newCourse.id}/editar`);
    },
    onError: () => toast.error('Erro ao criar curso')
  });

  const updateCourseMutation = useMutation({
    mutationFn: (data: Partial<Course>) => coursesService.updateCourse(courseId!, data),
    onSuccess: () => {
      toast.success('Curso atualizado!');
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: () => toast.error('Erro ao atualizar curso')
  });

  const createModuleMutation = useMutation({
    mutationFn: ({ title, description }: { title: string; description?: string }) => 
      coursesService.createModule(courseId!, title, description),
    onSuccess: () => {
      toast.success('Módulo criado!');
      refetchModules();
      setModuleDialog({ open: false });
      setModuleForm({ title: '', description: '' });
    },
    onError: () => toast.error('Erro ao criar módulo')
  });

  const updateModuleMutation = useMutation({
    mutationFn: ({ moduleId, title, description }: { moduleId: string; title: string; description?: string }) => 
      coursesService.updateModule(moduleId, title, description),
    onSuccess: () => {
      toast.success('Módulo atualizado!');
      refetchModules();
      setModuleDialog({ open: false });
      setModuleForm({ title: '', description: '' });
    },
    onError: () => toast.error('Erro ao atualizar módulo')
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (moduleId: string) => coursesService.deleteModule(moduleId),
    onSuccess: () => {
      toast.success('Módulo excluído!');
      refetchModules();
    },
    onError: () => toast.error('Erro ao excluir módulo')
  });

  const createLessonMutation = useMutation({
    mutationFn: ({ moduleId, lesson }: { moduleId: string; lesson: Partial<CourseLesson> }) => 
      coursesService.createLesson(moduleId, lesson),
    onSuccess: () => {
      toast.success('Aula criada!');
      refetchModules();
      setLessonDialog({ open: false, moduleId: '' });
      setLessonForm({ title: '', description: '', video_url: '', content_html: '', duration_minutes: 0 });
    },
    onError: () => toast.error('Erro ao criar aula')
  });

  const updateLessonMutation = useMutation({
    mutationFn: ({ lessonId, lesson }: { lessonId: string; lesson: Partial<CourseLesson> }) => 
      coursesService.updateLesson(lessonId, lesson),
    onSuccess: () => {
      toast.success('Aula atualizada!');
      refetchModules();
      setLessonDialog({ open: false, moduleId: '' });
      setLessonForm({ title: '', description: '', video_url: '', content_html: '', duration_minutes: 0 });
    },
    onError: () => toast.error('Erro ao atualizar aula')
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: string) => coursesService.deleteLesson(lessonId),
    onSuccess: () => {
      toast.success('Aula excluída!');
      refetchModules();
    },
    onError: () => toast.error('Erro ao excluir aula')
  });

  const handleSave = () => {
    if (!courseData.title?.trim()) {
      toast.error('O título do curso é obrigatório');
      return;
    }

    if (isEditing) {
      updateCourseMutation.mutate(courseData);
    } else {
      createCourseMutation.mutate(courseData);
    }
  };

  const handleTogglePublish = () => {
    updateCourseMutation.mutate({ is_published: !courseData.is_published });
    setCourseData(prev => ({ ...prev, is_published: !prev.is_published }));
  };

  const toggleModule = (moduleId: string) => {
    const newOpen = new Set(openModules);
    if (newOpen.has(moduleId)) {
      newOpen.delete(moduleId);
    } else {
      newOpen.add(moduleId);
    }
    setOpenModules(newOpen);
  };

  const openModuleDialog = (module?: CourseModule) => {
    if (module) {
      setModuleForm({ title: module.title, description: module.description || '' });
    } else {
      setModuleForm({ title: '', description: '' });
    }
    setModuleDialog({ open: true, module });
  };

  const openLessonDialog = (moduleId: string, lesson?: CourseLesson) => {
    if (lesson) {
      setLessonForm({
        title: lesson.title,
        description: lesson.description || '',
        video_url: lesson.video_url || '',
        content_html: lesson.content_html || '',
        duration_minutes: lesson.duration_minutes || 0
      });
    } else {
      setLessonForm({ title: '', description: '', video_url: '', content_html: '', duration_minutes: 0 });
    }
    setLessonDialog({ open: true, moduleId, lesson });
  };

  const handleSaveModule = () => {
    if (!moduleForm.title.trim()) {
      toast.error('O título do módulo é obrigatório');
      return;
    }

    if (moduleDialog.module) {
      updateModuleMutation.mutate({
        moduleId: moduleDialog.module.id,
        title: moduleForm.title,
        description: moduleForm.description || undefined
      });
    } else {
      createModuleMutation.mutate({
        title: moduleForm.title,
        description: moduleForm.description || undefined
      });
    }
  };

  const handleSaveLesson = () => {
    if (!lessonForm.title.trim()) {
      toast.error('O título da aula é obrigatório');
      return;
    }

    if (lessonDialog.lesson) {
      updateLessonMutation.mutate({
        lessonId: lessonDialog.lesson.id,
        lesson: lessonForm
      });
    } else {
      createLessonMutation.mutate({
        moduleId: lessonDialog.moduleId,
        lesson: lessonForm
      });
    }
  };

  if (isEditing && (loadingCourse || loadingModules)) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando curso...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/vacademy')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">
              {isEditing ? 'Editar Curso' : 'Novo Curso'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isEditing && (
              <Button 
                variant="outline" 
                onClick={handleTogglePublish}
                disabled={updateCourseMutation.isPending}
              >
                {courseData.is_published ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Despublicar
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Publicar
                  </>
                )}
              </Button>
            )}
            <Button 
              onClick={handleSave}
              disabled={createCourseMutation.isPending || updateCourseMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>

        {/* Course Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Curso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={courseData.title}
                  onChange={(e) => setCourseData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Nome do curso"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={courseData.description || ''}
                  onChange={(e) => setCourseData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do curso"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={courseData.category || ''}
                  onChange={(e) => setCourseData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Ex: Marketing, Vendas..."
                />
              </div>

              <div>
                <Label htmlFor="difficulty">Dificuldade</Label>
                <Select
                  value={courseData.difficulty}
                  onValueChange={(value) => setCourseData(prev => ({ ...prev, difficulty: value as Course['difficulty'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Iniciante</SelectItem>
                    <SelectItem value="intermediate">Intermediário</SelectItem>
                    <SelectItem value="advanced">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="duration">Duração (horas)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={0}
                  value={courseData.duration_hours || 0}
                  onChange={(e) => setCourseData(prev => ({ ...prev, duration_hours: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <Label htmlFor="thumbnail">URL da Thumbnail</Label>
                <Input
                  id="thumbnail"
                  value={courseData.thumbnail_url || ''}
                  onChange={(e) => setCourseData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modules - Only show when editing */}
        {isEditing && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Módulos e Aulas</CardTitle>
              <Button onClick={() => openModuleDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Módulo
              </Button>
            </CardHeader>
            <CardContent>
              {modules && modules.length > 0 ? (
                <div className="space-y-2">
                  {modules.map((module) => (
                    <Collapsible
                      key={module.id}
                      open={openModules.has(module.id)}
                      onOpenChange={() => toggleModule(module.id)}
                    >
                      <div className="border rounded-lg">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              {openModules.has(module.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <span className="font-medium">{module.title}</span>
                              <span className="text-sm text-muted-foreground">
                                ({module.lessons?.length || 0} aulas)
                              </span>
                            </div>
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => openModuleDialog(module)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  if (confirm('Excluir este módulo e todas as suas aulas?')) {
                                    deleteModuleMutation.mutate(module.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t p-3 space-y-2 bg-muted/30">
                            {module.lessons && module.lessons.length > 0 ? (
                              module.lessons.map((lesson) => (
                                <div 
                                  key={lesson.id}
                                  className="flex items-center justify-between p-2 bg-background rounded border"
                                >
                                  <div className="flex items-center gap-2">
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{lesson.title}</span>
                                    {lesson.duration_minutes > 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        ({lesson.duration_minutes}min)
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => openLessonDialog(module.id, lesson)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => {
                                        if (confirm('Excluir esta aula?')) {
                                          deleteLessonMutation.mutate(lesson.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                Nenhuma aula cadastrada
                              </p>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              onClick={() => openLessonDialog(module.id)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Nova Aula
                            </Button>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum módulo cadastrado.</p>
                  <p className="text-sm">Clique em "Novo Módulo" para começar.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Module Dialog */}
        <Dialog open={moduleDialog.open} onOpenChange={(open) => setModuleDialog({ open, module: moduleDialog.module })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {moduleDialog.module ? 'Editar Módulo' : 'Novo Módulo'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="moduleTitle">Título *</Label>
                <Input
                  id="moduleTitle"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Nome do módulo"
                />
              </div>
              <div>
                <Label htmlFor="moduleDescription">Descrição</Label>
                <Textarea
                  id="moduleDescription"
                  value={moduleForm.description}
                  onChange={(e) => setModuleForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do módulo (opcional)"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModuleDialog({ open: false })}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveModule}
                disabled={createModuleMutation.isPending || updateModuleMutation.isPending}
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lesson Dialog */}
        <Dialog open={lessonDialog.open} onOpenChange={(open) => setLessonDialog({ ...lessonDialog, open })}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {lessonDialog.lesson ? 'Editar Aula' : 'Nova Aula'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <Label htmlFor="lessonTitle">Título *</Label>
                <Input
                  id="lessonTitle"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Nome da aula"
                />
              </div>
              <div>
                <Label htmlFor="lessonDescription">Descrição</Label>
                <Textarea
                  id="lessonDescription"
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição da aula"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="lessonVideo">URL do Vídeo (YouTube)</Label>
                <Input
                  id="lessonVideo"
                  value={lessonForm.video_url}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, video_url: e.target.value }))}
                  placeholder="Cole qualquer link do YouTube (ex: youtube.com/watch?v=... ou youtu.be/...)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  O vídeo será exibido de forma protegida, sem opção de download.
                </p>
              </div>
              <div>
                <Label htmlFor="lessonDuration">Duração (minutos)</Label>
                <Input
                  id="lessonDuration"
                  type="number"
                  min={0}
                  value={lessonForm.duration_minutes}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="lessonContent">Conteúdo (HTML)</Label>
                <Textarea
                  id="lessonContent"
                  value={lessonForm.content_html}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, content_html: e.target.value }))}
                  placeholder="Conteúdo adicional em HTML..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLessonDialog({ open: false, moduleId: '' })}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveLesson}
                disabled={createLessonMutation.isPending || updateLessonMutation.isPending}
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
