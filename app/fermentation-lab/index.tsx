import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { AppHeader } from '@/components/AppHeader';
import { FermentationProjectForm } from '@/components/FermentationProjectForm';
import { colors, radii } from '@/constants/theme';
import { useFermentationRepository } from '@/hooks/useFermentationRepository';
import { getFermentationLabel, fermentationStatuses } from '@/features/fermentation/catalog';
import { LocalNotificationService } from '@/services/LocalNotificationService';
import { expoLocalNotificationAdapter } from '@/services/expoLocalNotificationAdapter';
import type { FermentationProject, FermentationProjectInput, FermentationReminder } from '@/types/fermentation';

export default function FermentationLabScreen() {
  const repository = useFermentationRepository();
  const [projects, setProjects] = useState<FermentationProject[]>([]);
  const [reminders, setReminders] = useState<FermentationReminder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projectList, taskList] = await Promise.all([repository.listProjects(), repository.listReminders(undefined, true)]);
      setProjects(projectList);
      setReminders(taskList.slice(0, 6));
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo abrir el laboratorio.'); }
    finally { setLoading(false); }
  }, [repository]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const saveProject = async (input: FermentationProjectInput) => {
    const project = await repository.createProject(input);
    const template = project.fermentationType;
    const { fermentationTemplates } = await import('@/features/fermentation/catalog');
    const selectedTemplate = fermentationTemplates.find((item) => item.id === template);
    if (selectedTemplate) {
      for (const field of selectedTemplate.suggestedFields) {
        await repository.createCustomField({ projectId: project.id, batchId: null, name: field.name, fieldType: field.type, unit: field.unit ?? '' });
      }
    }
    setShowForm(false);
    router.push({ pathname: '/fermentation-lab/[id]', params: { id: project.id } } as never);
  };

  const completeReminder = (reminder: FermentationReminder) => Alert.alert('Marcar tarea', `¿Has completado «${reminder.title}»?`, [
    { text: 'Ahora no', style: 'cancel' },
    { text: 'Completar', onPress: () => {
      void (async () => {
        await new LocalNotificationService(expoLocalNotificationAdapter).cancel(reminder.notificationId);
        await repository.setReminderCompleted(reminder.id, true);
        await load();
      })().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo completar la tarea.'));
    } },
  ]);

  const activeProjects = projects.filter((item) => ['planned', 'active', 'observing'].includes(item.status));
  const completedProjects = projects.filter((item) => item.status === 'completed');
  const pausedProjects = projects.filter((item) => item.status === 'paused');
  const discardedProjects = projects.filter((item) => item.status === 'discarded');

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Volver al cuaderno" onPress={() => router.back()} style={styles.back}><SymbolView name={{ android: 'arrow_back', ios: 'arrow.left', web: 'arrow_back' }} tintColor={colors.text} size={20} /></Pressable><View style={styles.heading}><AppHeader /><Text style={styles.title}>Mi laboratorio</Text></View><View style={styles.spacer} /></View>
        <Text style={styles.lede}>Un lugar para observar, anotar y acompañar cada cultivo a su manera.</Text>
        <View style={styles.hero}><View style={styles.heroCopy}><Text style={styles.heroEyebrow}>PEQUEÑAS TRANSFORMACIONES</Text><Text style={styles.heroTitle}>La paciencia también se cultiva.</Text><Text style={styles.heroText}>Tus tiempos y observaciones, siempre a mano.</Text></View><Image source={require('../../assets/images/fern-mouse.png')} style={styles.mouse} resizeMode="contain" /></View>

        <View style={styles.summaryRow}><Summary label="En marcha" count={activeProjects.length} tint={colors.greenLight} /><Summary label="En pausa" count={pausedProjects.length} tint="#F8EDD1" /><Summary label="Terminados" count={completedProjects.length} tint="#F7E2DE" /></View>

        <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Tus fermentos</Text><Text style={styles.sectionSub}>Cada uno sigue su propio camino</Text></View><Pressable accessibilityRole="button" onPress={() => setShowForm(true)} style={styles.createButton}><Text style={styles.createPlus}>+</Text><Text style={styles.createLabel}>Nuevo</Text></Pressable></View>
        {loading ? <ActivityIndicator style={styles.loader} color={colors.greenDark} /> : error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : projects.length ? <>
          <ProjectGroup title="En marcha" projects={activeProjects} />
          <ProjectGroup title="En pausa" projects={pausedProjects} />
          <ProjectGroup title="Completados" projects={completedProjects} />
          <ProjectGroup title="Descartados" projects={discardedProjects} />
        </> : <EmptyLab onCreate={() => setShowForm(true)} />}

        {reminders.length ? <View style={styles.tasksSection}><Text style={styles.sectionTitle}>Próximas tareas</Text><Text style={styles.sectionSub}>Pequeños recordatorios a tu ritmo</Text>{reminders.map((reminder) => <Pressable key={reminder.id} accessibilityRole="button" onPress={() => completeReminder(reminder)} style={styles.taskCard}><View style={styles.taskIcon}><SymbolView name={{ android: 'notifications_active', ios: 'bell', web: 'notifications_active' }} tintColor={colors.greenDark} size={18} /></View><View style={styles.taskCopy}><Text style={styles.taskTitle}>{reminder.title}</Text><Text style={styles.taskDate}>{formatDateTime(reminder.scheduledAt)}</Text></View><Text style={styles.taskDone}>Hecha</Text></Pressable>)}</View> : null}

        {projects.length ? <View style={styles.recentSection}><Text style={styles.sectionTitle}>Actualizados hace poco</Text>{projects.slice(0, 3).map((project) => <Pressable key={project.id} onPress={() => router.push({ pathname: '/fermentation-lab/[id]', params: { id: project.id } } as never)} style={styles.recentRow}><Text style={styles.recentBullet}>✳</Text><Text style={styles.recentName}>{project.name}</Text><Text style={styles.recentDate}>{formatDateTime(project.updatedAt)}</Text></Pressable>)}</View> : null}
        <Text style={styles.disclaimer}>El laboratorio es un registro personal, no una guía de conservación. El tiempo y las mediciones no garantizan la seguridad de un fermento.</Text>
      </ScrollView>
      {showForm ? <FermentationProjectForm onCancel={() => setShowForm(false)} onSave={saveProject} /> : null}
    </SafeAreaView>
  );
}

function ProjectCard({ project, onPress }: { project: FermentationProject; onPress: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const status = fermentationStatuses.find((item) => item.id === project.status)?.label ?? 'Activo';
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.projectCard}>
    {project.initialPhotoUri && !imageFailed ? <Image source={{ uri: project.initialPhotoUri }} onError={() => setImageFailed(true)} style={styles.projectImage} resizeMode="cover" /> : <View style={styles.projectArtwork}><SymbolView name={{ android: 'science', ios: 'testtube.2', web: 'science' }} tintColor={colors.greenDark} size={24} /></View>}
    <View style={styles.projectCopy}><View style={styles.projectTop}><Text style={styles.projectType}>{getFermentationLabel(project.fermentationType, project.customTypeName)}</Text><View style={[styles.statusPill, statusStyle(project.status)]}><Text style={[styles.statusText, statusTextStyle(project.status)]}>{status}</Text></View></View><Text numberOfLines={1} style={styles.projectName}>{project.name}</Text><Text style={styles.projectMeta}>Desde {formatDate(project.startDate)}{project.currentStage ? ` · ${eventStage(project.currentStage)}` : ''}</Text>{project.nextReminder ? <Text numberOfLines={1} style={styles.projectNext}>Próximo · {project.nextReminder.title} · {formatDateTime(project.nextReminder.scheduledAt)}</Text> : null}</View>
    <SymbolView name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }} tintColor={colors.secondaryText} size={17} />
  </Pressable>;
}

function Summary({ label, count, tint }: { label: string; count: number; tint: string }) {
  return <View style={[styles.summaryCard, { backgroundColor: tint }]}><Text style={styles.summaryCount}>{count}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

function ProjectGroup({ title, projects }: { title: string; projects: FermentationProject[] }) {
  if (!projects.length) return null;
  return <View style={styles.projectGroup}><Text style={styles.groupTitle}>{title}</Text>{projects.map((project) => <ProjectCard key={project.id} project={project} onPress={() => router.push({ pathname: '/fermentation-lab/[id]', params: { id: project.id } } as never)} />)}</View>;
}

function EmptyLab({ onCreate }: { onCreate: () => void }) {
  return <View style={styles.emptyCard}><Image source={require('../../assets/images/fern-mouse.png')} style={styles.emptyMouse} resizeMode="contain" /><Text style={styles.emptyTitle}>Tu primer fermento empieza aquí</Text><Text style={styles.emptyText}>Guarda su preparación y acompaña sus cambios día a día.</Text><Pressable accessibilityRole="button" onPress={onCreate} style={styles.emptyButton}><Text style={styles.emptyButtonText}>Crear un proyecto</Text></Pressable></View>;
}

function formatDate(value: string): string { return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`)); }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function eventStage(value: string): string { return value.length > 25 ? 'con novedades' : value; }
function statusStyle(status: string) { return status === 'paused' ? styles.statusPaused : status === 'completed' ? styles.statusComplete : status === 'discarded' ? styles.statusDiscarded : styles.statusActive; }
function statusTextStyle(status: string) { return status === 'paused' ? styles.statusTextPaused : status === 'completed' ? styles.statusTextComplete : status === 'discarded' ? styles.statusTextDiscarded : styles.statusTextActive; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { paddingBottom: 36 }, header: { minHeight: 59, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 9 }, back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.white }, heading: { flex: 1 }, spacer: { width: 38 }, title: { marginTop: -3, color: colors.text, fontFamily: 'serif', fontSize: 25, fontWeight: '700', textAlign: 'center' }, lede: { marginHorizontal: 28, marginBottom: 15, color: colors.secondaryText, fontSize: 11, lineHeight: 17, textAlign: 'center' }, hero: { minHeight: 126, marginHorizontal: 20, padding: 15, flexDirection: 'row', alignItems: 'center', borderRadius: 20, backgroundColor: '#F8EDD1' }, heroCopy: { flex: 1 }, heroEyebrow: { color: '#9A7A3A', fontSize: 8, fontWeight: '800', letterSpacing: 1 }, heroTitle: { maxWidth: 230, marginTop: 6, color: colors.text, fontFamily: 'serif', fontSize: 18, fontWeight: '700' }, heroText: { marginTop: 5, color: colors.secondaryText, fontSize: 9 }, mouse: { width: 88, height: 95 }, summaryRow: { marginHorizontal: 20, marginTop: 12, flexDirection: 'row', gap: 7 }, summaryCard: { minHeight: 57, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 15 }, summaryCount: { color: colors.text, fontSize: 17, fontWeight: '700' }, summaryLabel: { marginTop: 1, color: colors.secondaryText, fontSize: 8 }, sectionHeader: { marginHorizontal: 22, marginTop: 24, marginBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { color: colors.text, fontFamily: 'serif', fontSize: 18, fontWeight: '700' }, sectionSub: { marginTop: 3, color: colors.secondaryText, fontSize: 9 }, createButton: { minHeight: 35, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radii.pill, backgroundColor: colors.greenDark }, createPlus: { color: colors.white, fontSize: 18, lineHeight: 20 }, createLabel: { color: colors.white, fontSize: 9, fontWeight: '700' }, loader: { marginVertical: 45 }, error: { marginHorizontal: 21, padding: 12, color: '#994D43', backgroundColor: '#FBE7E2', borderRadius: 12 }, projectGroup: { marginTop: 7 }, groupTitle: { marginHorizontal: 22, marginBottom: 7, color: colors.greenDark, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }, projectCard: { minHeight: 91, marginHorizontal: 20, marginBottom: 8, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 17, backgroundColor: colors.white, elevation: 1, shadowColor: '#3A392F', shadowOpacity: 0.05, shadowRadius: 7, shadowOffset: { width: 0, height: 2 } }, projectImage: { width: 59, height: 59, borderRadius: 15 }, projectArtwork: { width: 59, height: 59, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.greenLight }, projectCopy: { flex: 1, minWidth: 0 }, projectTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 }, projectType: { color: colors.greenDark, fontSize: 9, fontWeight: '700' }, statusPill: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: radii.pill }, statusText: { fontSize: 7, fontWeight: '700' }, statusActive: { backgroundColor: colors.greenLight }, statusPaused: { backgroundColor: '#F8EDD1' }, statusComplete: { backgroundColor: '#F7E2DE' }, statusDiscarded: { backgroundColor: '#EFEADF' }, statusTextActive: { color: colors.greenDark }, statusTextPaused: { color: '#8F6D28' }, statusTextComplete: { color: '#9D6158' }, statusTextDiscarded: { color: colors.secondaryText }, projectName: { marginTop: 5, color: colors.text, fontSize: 12, fontWeight: '700' }, projectMeta: { marginTop: 4, color: colors.secondaryText, fontSize: 8 }, projectNext: { marginTop: 4, color: '#987839', fontSize: 8 }, emptyCard: { marginHorizontal: 20, marginTop: 8, padding: 21, alignItems: 'center', borderRadius: 20, backgroundColor: colors.white }, emptyMouse: { width: 87, height: 88 }, emptyTitle: { marginTop: 7, color: colors.text, fontFamily: 'serif', fontSize: 17, fontWeight: '700', textAlign: 'center' }, emptyText: { marginTop: 5, color: colors.secondaryText, fontSize: 10, lineHeight: 15, textAlign: 'center' }, emptyButton: { minHeight: 39, marginTop: 13, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.greenDark }, emptyButtonText: { color: colors.white, fontSize: 10, fontWeight: '700' }, tasksSection: { marginHorizontal: 22, marginTop: 20 }, taskCard: { minHeight: 59, marginTop: 7, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, backgroundColor: colors.white }, taskIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.greenLight }, taskCopy: { flex: 1 }, taskTitle: { color: colors.text, fontSize: 10, fontWeight: '700' }, taskDate: { marginTop: 3, color: colors.secondaryText, fontSize: 8 }, taskDone: { color: colors.greenDark, fontSize: 8, fontWeight: '700' }, recentSection: { marginHorizontal: 22, marginTop: 20 }, recentRow: { minHeight: 39, flexDirection: 'row', alignItems: 'center', gap: 7, borderBottomWidth: 1, borderBottomColor: colors.border }, recentBullet: { color: colors.coral, fontSize: 14 }, recentName: { flex: 1, color: colors.text, fontSize: 9, fontWeight: '600' }, recentDate: { color: colors.secondaryText, fontSize: 8 }, disclaimer: { marginHorizontal: 25, marginTop: 20, color: colors.secondaryText, fontSize: 8, lineHeight: 13, textAlign: 'center' },
});
