import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as ImagePicker from 'expo-image-picker';
import { colors, radii } from '@/constants/theme';
import { useFermentationRepository } from '@/hooks/useFermentationRepository';
import { useCollectionRepository } from '@/hooks/useCollectionRepository';
import { fermentationStatuses, fermentationTemplates, getFermentationLabel } from '@/features/fermentation/catalog';
import { calculateBrineSalt, calculateHydration, calculateSourdoughFeeding } from '@/features/fermentation/calculators';
import { expoLocalNotificationAdapter } from '@/services/expoLocalNotificationAdapter';
import { LocalNotificationService } from '@/services/LocalNotificationService';
import type { FermentationBatch, FermentationCustomField, FermentationEvent, FermentationEventType, FermentationIngredient, FermentationMeasurement, FermentationProject, FermentationProjectInput, FermentationReminderInput, FermentationStatus, FermentationTaskType } from '@/types/fermentation';

type DetailSection = 'overview' | 'timeline' | 'measurements' | 'notes' | 'batches' | 'tasks' | 'calculators';
const sections: { id: DetailSection; label: string }[] = [
  { id: 'overview', label: 'Resumen' }, { id: 'timeline', label: 'Actividad' }, { id: 'measurements', label: 'Medidas' },
  { id: 'notes', label: 'Notas y fotos' }, { id: 'batches', label: 'Lotes' }, { id: 'tasks', label: 'Tareas' }, { id: 'calculators', label: 'Cálculos' },
];

export default function FermentationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const repository = useFermentationRepository();
  const collectionRepository = useCollectionRepository();
  const [project, setProject] = useState<FermentationProject | null>(null);
  const [events, setEvents] = useState<FermentationEvent[]>([]);
  const [batches, setBatches] = useState<FermentationBatch[]>([]);
  const [reminders, setReminders] = useState<Awaited<ReturnType<typeof repository.listReminders>>>([]);
  const [photos, setPhotos] = useState<Awaited<ReturnType<typeof repository.listPhotos>>>([]);
  const [fields, setFields] = useState<FermentationCustomField[]>([]);
  const [section, setSection] = useState<DetailSection>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventModal, setEventModal] = useState(false);
  const [batchModal, setBatchModal] = useState(false);
  const [reminderModal, setReminderModal] = useState(false);
  const [fieldModal, setFieldModal] = useState(false);
  const [calculatorModal, setCalculatorModal] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const [fieldToRecord, setFieldToRecord] = useState<FermentationCustomField | null>(null);
  const [editingReminder, setEditingReminder] = useState<(typeof reminders)[number] | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextProject, nextEvents, nextBatches, nextReminders, nextPhotos, nextFields] = await Promise.all([
        repository.getProject(id), repository.listEvents(id), repository.listBatches(id), repository.listReminders(id), repository.listPhotos(id), repository.listCustomFields(id, selectedBatch),
      ]);
      setProject(nextProject); setEvents(nextEvents); setBatches(nextBatches); setReminders(nextReminders); setPhotos(nextPhotos); setFields(nextFields); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar el fermento.'); }
    finally { setLoading(false); }
  }, [id, repository, selectedBatch]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const measuredEvents = useMemo(() => events.filter((event) => event.measurements.length > 0 && event.batchId === selectedBatch), [events, selectedBatch]);
  const supportsFeeding = fermentationTemplates.find((template) => template.id === project?.fermentationType)?.supportsFeeding ?? false;

  const changeStatus = () => {
    if (!project) return;
    const options = fermentationStatuses.map((item) => ({ text: item.label, onPress: () => {
      void repository.setProjectStatus(project.id, item.id).then(async () => {
        if (item.id === 'completed') {
          let rewards: string[] = [];
          try { rewards = await collectionRepository.recordAction('fermentation_completed', project.id); }
          catch { Alert.alert('Estado guardado', 'El proyecto se marcó como completado, pero no se pudo actualizar el progreso de la colección.'); }
          if (rewards.length) Alert.alert('Un nuevo hito', `Has desbloqueado «${rewards[0]}».`, [{ text: 'Continuar' }]);
        }
        await load();
      }).catch(showError);
    } }));
    Alert.alert('Estado del fermento', 'Elige el estado que mejor refleja tu seguimiento.', [...options, { text: 'Cancelar', style: 'cancel' }]);
  };

  const saveEvent = async (input: { eventType: FermentationEventType; description: string; notes: string; measurements: FermentationMeasurement[]; ingredients: FermentationIngredient[]; photoUri: string | null; eventDate?: string }) => {
    const eventDate = input.eventDate ?? new Date().toISOString();
    const event = await repository.createEvent({ projectId: id, batchId: selectedBatch, eventType: input.eventType, eventDate, description: input.description, notes: input.notes, measurements: input.measurements, ingredients: input.ingredients });
    if (['feeding', 'measurement', 'observation', 'note'].includes(input.eventType)) {
      let rewards: string[] = [];
      try { rewards = await collectionRepository.recordAction('fermentation_event', event.id); }
      catch { Alert.alert('Avance guardado', 'Tu registro está en la línea de tiempo, pero no se pudo actualizar el progreso de la colección.'); }
      if (rewards.length) Alert.alert('Un nuevo hito', `Has desbloqueado «${rewards[0]}».`, [{ text: 'Continuar' }]);
    }
    if (input.photoUri) await repository.addPhoto({ projectId: id, batchId: selectedBatch, eventId: event.id, localUri: input.photoUri, caption: input.description || 'Observación' });
    setEventModal(false);
    await load();
  };

  const saveBatch = async (batch: { name: string; startDate: string; notes: string; ingredients: FermentationIngredient[] }) => {
    const saved = await repository.saveBatch({ projectId: id, name: batch.name, startDate: batch.startDate, completionDate: null, status: 'active', notes: batch.notes, ingredients: batch.ingredients });
    setSelectedBatch(saved.id); setBatchModal(false); await load();
  };

  const deleteBatch = (batch: FermentationBatch) => Alert.alert('Eliminar lote', `¿Quieres eliminar «${batch.name}» y su historial asociado?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => { void (async () => { const service = new LocalNotificationService(expoLocalNotificationAdapter); for (const reminder of reminders.filter((item) => item.batchId === batch.id)) await service.cancel(reminder.notificationId); await repository.deleteBatch(batch.id); if (selectedBatch === batch.id) setSelectedBatch(null); await load(); })().catch(showError); } },
  ]);

  const saveReminder = async (input: FermentationReminderInput, reminderId?: string) => {
    const service = new LocalNotificationService(expoLocalNotificationAdapter);
    const notificationId = await service.schedule({ title: input.title, body: project?.name ?? 'Es momento de revisar tu fermento.', scheduledAt: new Date(input.scheduledAt), data: { url: `/fermentation-lab/${id}` } });
    try { await repository.saveReminder(input, notificationId, reminderId); }
    catch (cause) { await service.cancel(notificationId); throw cause; }
    if (editingReminder?.notificationId) await service.cancel(editingReminder.notificationId);
    setReminderModal(false); setEditingReminder(null); await load();
    if (!notificationId) Alert.alert('Recordatorio guardado', 'El dispositivo no autorizó notificaciones. La tarea queda en tu lista para consultarla en la aplicación.');
  };

  const toggleReminder = async (reminder: (typeof reminders)[number]) => {
    const completed = !reminder.isCompleted;
    const service = new LocalNotificationService(expoLocalNotificationAdapter);
    if (completed) {
      await service.cancel(reminder.notificationId);
      await repository.setReminderCompleted(reminder.id, true);
    } else {
      const notificationId = await service.schedule({ title: reminder.title, body: project?.name ?? 'Es momento de revisar tu fermento.', scheduledAt: new Date(reminder.scheduledAt), data: { url: `/fermentation-lab/${id}` } });
      await repository.saveReminder({ projectId: reminder.projectId, batchId: reminder.batchId, title: reminder.title, taskType: reminder.taskType, scheduledAt: reminder.scheduledAt }, notificationId, reminder.id);
    }
    await load();
  };

  const deleteReminder = (reminder: (typeof reminders)[number]) => Alert.alert('Cancelar recordatorio', `¿Quieres cancelar «${reminder.title}»?`, [
    { text: 'Volver', style: 'cancel' },
    { text: 'Cancelar tarea', style: 'destructive', onPress: () => {
      void (async () => { await new LocalNotificationService(expoLocalNotificationAdapter).cancel(reminder.notificationId); await repository.deleteReminder(reminder.id); await load(); })().catch(showError);
    } },
  ]);

  const saveField = async (field: { name: string; fieldType: FermentationCustomField['fieldType']; unit: string }) => {
    await repository.createCustomField({ projectId: id, batchId: selectedBatch, ...field });
    setFieldModal(false); await load();
  };

  const deleteField = (field: FermentationCustomField) => Alert.alert('Quitar campo', `¿Quieres quitar «${field.name}» y su historial de valores?`, [
    { text: 'Conservar', style: 'cancel' },
    { text: 'Quitar', style: 'destructive', onPress: () => { void repository.deleteCustomField(field.id).then(load).catch(showError); } },
  ]);

  const logFieldValue = (field: FermentationCustomField) => setFieldToRecord(field);

  const saveFieldValue = async (value: string) => {
    if (!fieldToRecord) return;
    const event = await repository.createEvent({ projectId: id, batchId: fieldToRecord.batchId, eventType: 'measurement', eventDate: new Date().toISOString(), description: fieldToRecord.name, measurements: [], ingredients: [], notes: '' });
    await repository.saveCustomFieldValue(fieldToRecord.id, event.id, value, event.eventDate);
    setFieldToRecord(null); await load();
  };

  const addPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        await repository.addPhoto({ projectId: id, batchId: selectedBatch, eventId: null, localUri: result.assets[0].uri, caption: 'Fotografía del fermento' });
        await load();
      }
    } catch (cause) { showError(cause); }
  };

  if (loading) return <SafeAreaView style={styles.safe}><ActivityIndicator style={styles.loader} color={colors.greenDark} /></SafeAreaView>;
  if (!project) return <SafeAreaView style={styles.safe}><Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ Volver</Text></Pressable><Text style={styles.error}>{error || 'No encontramos este fermento.'}</Text></SafeAreaView>;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.topBar}><Pressable accessibilityRole="button" accessibilityLabel="Volver al laboratorio" onPress={() => router.back()} style={styles.back}><SymbolView name={{ android: 'arrow_back', ios: 'arrow.left', web: 'arrow_back' }} tintColor={colors.text} size={19} /></Pressable><Text numberOfLines={1} style={styles.topTitle}>{project.name}</Text><Pressable accessibilityRole="button" accessibilityLabel="Editar proyecto" onPress={() => setEditingProject(true)} style={styles.editButton}><SymbolView name={{ android: 'edit', ios: 'pencil', web: 'edit' }} tintColor={colors.greenDark} size={17} /></Pressable></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{sections.map((item) => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: section === item.id }} onPress={() => setSection(item.id)} style={[styles.tab, section === item.id && styles.tabActive]}><Text style={[styles.tabText, section === item.id && styles.tabTextActive]}>{item.label}</Text></Pressable>)}</ScrollView>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {section === 'overview' ? <OverviewSection project={project} events={events} reminders={reminders} onStatus={changeStatus} onLog={() => setEventModal(true)} onTask={() => setReminderModal(true)} onBatch={() => setBatchModal(true)} onCalculators={() => setCalculatorModal(true)} /> : null}
        {section === 'timeline' ? <TimelineSection events={events.filter((event) => event.batchId === selectedBatch)} onAdd={() => setEventModal(true)} /> : null}
        {section === 'measurements' ? <MeasurementSection events={measuredEvents} fields={fields} history={repository.listCustomFieldHistory.bind(repository)} onAddField={() => setFieldModal(true)} onLogField={logFieldValue} onDeleteField={deleteField} onRecord={() => setEventModal(true)} batchId={selectedBatch} /> : null}
        {section === 'notes' ? <NotesSection project={project} events={events} photos={photos} onAddNote={() => setEventModal(true)} onAddPhoto={() => { void addPhoto(); }} /> : null}
        {section === 'batches' ? <BatchSection batches={batches} selectedBatch={selectedBatch} onSelect={setSelectedBatch} onAdd={() => setBatchModal(true)} onDelete={deleteBatch} onStatusChange={() => { void load(); }} /> : null}
        {section === 'tasks' ? <ReminderSection reminders={reminders} onAdd={() => { setEditingReminder(null); setReminderModal(true); }} onToggle={(reminder) => { void toggleReminder(reminder).catch(showError); }} onDelete={deleteReminder} onEdit={(reminder) => { setEditingReminder(reminder); setReminderModal(true); }} /> : null}
        {section === 'calculators' ? <CalculatorSection onSave={(description, measurements, ingredients) => { void saveEvent({ eventType: 'measurement', description, notes: 'Cálculo personal guardado; no es una evaluación de seguridad.', measurements, ingredients, photoUri: null }); }} /> : null}
        <View style={styles.safetyCard}><Text style={styles.safetyTitle}>Información de seguridad</Text><Text style={styles.safety}>Este laboratorio conserva observaciones personales, no es una guía de conservación. El tiempo y el pH por sí solos no garantizan la seguridad. Si un producto muestra señales de deterioro, no lo pruebes y consulta orientación fiable de seguridad alimentaria.</Text></View>
      </ScrollView>
      {eventModal ? <EventForm batchId={selectedBatch} allowFeeding={supportsFeeding} onCancel={() => setEventModal(false)} onSave={saveEvent} /> : null}
      {batchModal ? <BatchForm projectId={id} onCancel={() => setBatchModal(false)} onSave={saveBatch} /> : null}
      {reminderModal ? <ReminderForm key={editingReminder?.id ?? 'new'} projectId={id} batchId={selectedBatch} allowFeeding={supportsFeeding} initialReminder={editingReminder} onCancel={() => { setReminderModal(false); setEditingReminder(null); }} onSave={saveReminder} /> : null}
      {fieldModal ? <FieldForm onCancel={() => setFieldModal(false)} onSave={saveField} /> : null}
      {fieldToRecord ? <FieldValueForm field={fieldToRecord} onCancel={() => setFieldToRecord(null)} onSave={saveFieldValue} /> : null}
      {calculatorModal ? <CalculatorModal onClose={() => setCalculatorModal(false)} onSave={(description, measurements, ingredients) => { setCalculatorModal(false); void saveEvent({ eventType: 'measurement', description, notes: 'Cálculo personal guardado; no es una evaluación de seguridad.', measurements, ingredients, photoUri: null }); }} /> : null}
      {editingProject ? <EditProjectModal project={project} onCancel={() => setEditingProject(false)} onSave={async (updated) => { await repository.updateProject(project.id, updated); setEditingProject(false); await load(); }} /> : null}
    </SafeAreaView>
  );
}

function OverviewSection({ project, events, reminders, onStatus, onLog, onTask, onBatch, onCalculators }: { project: FermentationProject; events: FermentationEvent[]; reminders: Awaited<ReturnType<ReturnType<typeof useFermentationRepository>['listReminders']>>; onStatus: () => void; onLog: () => void; onTask: () => void; onBatch: () => void; onCalculators: () => void }) {
  const status = fermentationStatuses.find((item) => item.id === project.status)?.label ?? project.status;
  return <View>
    {project.initialPhotoUri ? <Image source={{ uri: project.initialPhotoUri }} style={styles.cover} resizeMode="cover" /> : <View style={styles.coverBlank}><SymbolView name={{ android: 'science', ios: 'testtube.2', web: 'science' }} tintColor={colors.greenDark} size={28} /></View>}
    <Text style={styles.typeLabel}>{getFermentationLabel(project.fermentationType, project.customTypeName)}</Text><Text style={styles.projectTitle}>{project.name}</Text>
    <Pressable accessibilityRole="button" onPress={onStatus} style={styles.statusChange}><Text style={styles.statusChangeText}>Estado · {status}　⌄</Text></Pressable>
    <View style={styles.infoCard}><InfoRow label="Inicio" value={formatDate(project.startDate)} /><InfoRow label="Etapa actual" value={project.currentStage ? eventLabel(events[0]) : 'Preparación inicial'} /><InfoRow label="Última actualización" value={formatDateTime(project.updatedAt)} /><InfoRow label="Próxima tarea" value={project.nextReminder?.title ?? 'Sin tareas programadas'} /></View>
    <Text style={styles.sectionHeading}>Ingredientes</Text>
    {project.ingredients.length ? project.ingredients.map((item, index) => <View key={`${item.name}-${index}`} style={styles.ingredientLine}><Text style={styles.ingredientName}>{item.name}</Text><Text style={styles.ingredientValue}>{item.quantity !== null ? `${formatNumber(item.quantity)} ${item.unit}` : item.unit || 'Sin cantidad'}</Text></View>) : <Text style={styles.muted}>Aún no has anotado ingredientes.</Text>}
    {project.description ? <View style={styles.noteCard}><Text style={styles.sectionHeading}>Sobre este fermento</Text><Text style={styles.body}>{project.description}</Text></View> : null}
    {project.temperatureNotes ? <View style={styles.noteCard}><Text style={styles.sectionHeading}>Temperatura</Text><Text style={styles.body}>{project.temperatureNotes}</Text></View> : null}
    <View style={styles.quickActions}><ActionButton icon="edit_note" label="Anotar" onPress={onLog} /><ActionButton icon="notifications_active" label="Recordatorio" onPress={onTask} /><ActionButton icon="science" label="Lote" onPress={onBatch} /><ActionButton icon="calculate" label="Calcular" onPress={onCalculators} /></View>
  </View>;
}

function InfoRow({ label, value }: { label: string; value: string }) { return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text numberOfLines={2} style={styles.infoValue}>{value}</Text></View>; }
function ActionButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) { return <Pressable accessibilityRole="button" onPress={onPress} style={styles.action}><View style={styles.actionIcon}><SymbolView name={{ android: icon as never, ios: 'plus', web: icon as never }} tintColor={colors.greenDark} size={18} /></View><Text style={styles.actionLabel}>{label}</Text></Pressable>; }

function TimelineSection({ events, onAdd }: { events: FermentationEvent[]; onAdd: () => void }) {
  return <View><SectionHeading title="Diario del fermento" subtitle="Cada observación forma parte de su historia" onAdd={onAdd} addLabel="Anotar" />{events.length ? events.map((event) => <View key={event.id} style={styles.timelineRow}><View style={styles.timelineRail}><View style={styles.timelineDot} /><View style={styles.timelineLine} /></View><View style={styles.timelineCard}><Text style={styles.timelineDate}>{formatDateTime(event.eventDate)}</Text><Text style={styles.timelineTitle}>{eventLabel(event)}</Text>{event.description && event.description !== eventLabel(event) ? <Text style={styles.body}>{event.description}</Text> : null}{event.notes ? <Text style={styles.body}>{event.notes}</Text> : null}{event.measurements.map((item, index) => <Text key={`${item.name}-${index}`} style={styles.measurementPill}>{item.name} · {formatNumber(item.value)} {item.unit}</Text>)}{event.ingredients.map((item, index) => <Text key={`${item.name}-${index}`} style={styles.body}>{item.name} · {item.quantity ?? '—'} {item.unit}</Text>)}</View></View>) : <EmptyMessage title="Aún no hay apuntes" description="Registra una observación, preparación o alimentación." />}</View>;
}

function MeasurementSection({ events, fields, history, onAddField, onLogField, onDeleteField, onRecord, batchId }: { events: FermentationEvent[]; fields: FermentationCustomField[]; history: (id: string) => Promise<Awaited<ReturnType<ReturnType<typeof useFermentationRepository>['listCustomFieldHistory']>>>; onAddField: () => void; onLogField: (field: FermentationCustomField) => void; onDeleteField: (field: FermentationCustomField) => void; onRecord: () => void; batchId: string | null }) {
  const [historyByField, setHistoryByField] = useState<Record<string, { value: string; recordedAt: string }[]>>({});
  const loadHistory = async (field: FermentationCustomField) => { const values = await history(field.id); setHistoryByField((current) => ({ ...current, [field.id]: values.map((item) => ({ value: item.value, recordedAt: item.recordedAt })) })); };
  return <View><SectionHeading title="Mediciones" subtitle={batchId ? 'Registro de este lote independiente' : 'Registra solo lo que tenga sentido para tu fermento'} onAdd={onRecord} addLabel="Medir" />
    {fields.map((field) => <View key={field.id} style={styles.customFieldCard}><View style={styles.customFieldTop}><View style={styles.customFieldCopy}><Text style={styles.customFieldName}>{field.name}{field.unit ? ` (${field.unit})` : ''}</Text><Text style={styles.muted}>Campo {fieldTypeLabel(field.fieldType)}</Text></View><Pressable accessibilityRole="button" onPress={() => onLogField(field)} style={styles.smallButton}><Text style={styles.smallButtonText}>Añadir valor</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Quitar campo ${field.name}`} onPress={() => onDeleteField(field)} style={styles.smallIcon}><SymbolView name={{ android: 'delete_outline', ios: 'trash', web: 'delete_outline' }} tintColor="#AD5B52" size={14} /></Pressable></View><Pressable onPress={() => { void loadHistory(field); }}><Text style={styles.historyLink}>Ver historial</Text></Pressable>{(historyByField[field.id] ?? []).map((item, index) => <Text key={`${field.id}-${index}`} style={styles.measureHistory}>{item.value} {field.unit} · {formatDateTime(item.recordedAt)}</Text>)}</View>)}
    {events.map((event) => event.measurements.length ? <View key={event.id} style={styles.infoCard}><Text style={styles.timelineDate}>{formatDateTime(event.eventDate)}</Text>{event.measurements.map((item, index) => <InfoRow key={`${event.id}-${index}`} label={item.name} value={`${formatNumber(item.value)} ${item.unit}`} />)}</View> : null)}
    <Pressable accessibilityRole="button" onPress={onAddField} style={styles.outlineButton}><Text style={styles.outlineText}>＋ Crear campo personalizado</Text></Pressable>
    {!fields.length && !events.length ? <EmptyMessage title="Sin medidas por ahora" description="Temperatura, pH, volumen u otro dato que quieras seguir." /> : null}
  </View>;
}

function NotesSection({ project, events, photos, onAddNote, onAddPhoto }: { project: FermentationProject; events: FermentationEvent[]; photos: Awaited<ReturnType<ReturnType<typeof useFermentationRepository>['listPhotos']>>; onAddNote: () => void; onAddPhoto: () => void }) {
  return <View><SectionHeading title="Notas personales" subtitle="Tus impresiones, separadas de cualquier guía de seguridad" onAdd={onAddNote} addLabel="Escribir" />{project.personalNotes ? <View style={styles.noteCard}><Text style={styles.body}>{project.personalNotes}</Text></View> : null}{events.filter((event) => event.notes).map((event) => <View key={event.id} style={styles.noteCard}><Text style={styles.timelineDate}>{formatDateTime(event.eventDate)}</Text><Text style={styles.body}>{event.notes}</Text></View>)}<SectionHeading title="Fotografías" subtitle="Observa los cambios a lo largo del tiempo" onAdd={onAddPhoto} addLabel="Añadir foto" />{photos.length ? <View style={styles.photoGrid}>{photos.map((photo) => <PhotoCard key={photo.id} uri={photo.localUri} caption={photo.caption} date={photo.createdAt} />)}</View> : <EmptyMessage title="Sin fotografías" description="Puedes guardar imágenes locales junto a tus observaciones." />}</View>;
}

function PhotoCard({ uri, caption, date }: { uri: string; caption: string; date: string }) {
  const [failed, setFailed] = useState(false);
  return <View style={styles.photoCard}>{failed ? <View style={styles.photoMissing}><Text style={styles.photoMissingText}>Foto no disponible</Text></View> : <Image source={{ uri }} onError={() => setFailed(true)} style={styles.photoImage} resizeMode="cover" />}<Text numberOfLines={2} style={styles.photoCaption}>{caption}</Text><Text style={styles.photoDate}>{formatDateTime(date)}</Text></View>;
}

function BatchSection({ batches, selectedBatch, onSelect, onAdd, onDelete, onStatusChange }: { batches: FermentationBatch[]; selectedBatch: string | null; onSelect: (id: string | null) => void; onAdd: () => void; onDelete: (batch: FermentationBatch) => void; onStatusChange: () => void }) {
  return <View><SectionHeading title="Lotes independientes" subtitle="Tarros, tandas y pruebas con seguimiento propio" onAdd={onAdd} addLabel="Nuevo lote" />{selectedBatch ? <Pressable onPress={() => onSelect(null)} style={styles.selectedBatch}><Text style={styles.selectedBatchText}>Viendo el proyecto completo · Quitar filtro</Text></Pressable> : null}{batches.length ? batches.map((batch) => <View key={batch.id} style={[styles.batchCard, batch.id === selectedBatch && styles.batchSelected]}><Pressable onPress={() => onSelect(batch.id === selectedBatch ? null : batch.id)} style={styles.batchMain}><View style={styles.batchIcon}><SymbolView name={{ android: 'science', ios: 'testtube.2', web: 'science' }} tintColor={colors.greenDark} size={18} /></View><View style={styles.batchCopy}><Text style={styles.batchName}>{batch.name}</Text><Text style={styles.muted}>Desde {formatDate(batch.startDate)} · {statusLabel(batch.status)}</Text>{batch.ingredients.map((item, index) => <Text key={`${item.name}-${index}`} style={styles.batchIngredient}>{item.name}{item.quantity !== null ? ` · ${item.quantity} ${item.unit}` : ''}</Text>)}</View></Pressable><View style={styles.batchActions}><Pressable onPress={() => onDelete(batch)} style={styles.smallIcon}><SymbolView name={{ android: 'delete_outline', ios: 'trash', web: 'delete_outline' }} tintColor="#AD5B52" size={16} /></Pressable><StatusCycle batch={batch} onChange={onStatusChange} /></View></View>) : <EmptyMessage title="Sin lotes todavía" description="Crea lotes para seguir por separado tus tarros o tandas." />}</View>;
}

function StatusCycle({ batch, onChange }: { batch: FermentationBatch; onChange: () => void }) {
  const repository = useFermentationRepository();
  const cycle = async () => {
    const index = fermentationStatuses.findIndex((item) => item.id === batch.status);
    const next = fermentationStatuses[(index + 1) % fermentationStatuses.length].id;
    try { await repository.setBatchStatus(batch.id, next); onChange(); }
    catch (cause) { showError(cause); }
  };
  return <Pressable accessibilityRole="button" onPress={() => { void cycle(); }} style={styles.statusMini}><Text style={styles.statusMiniText}>{statusLabel(batch.status)} · cambiar</Text></Pressable>;
}

function ReminderSection({ reminders, onAdd, onToggle, onDelete, onEdit }: { reminders: Awaited<ReturnType<ReturnType<typeof useFermentationRepository>['listReminders']>>; onAdd: () => void; onToggle: (reminder: (typeof reminders)[number]) => void; onDelete: (reminder: (typeof reminders)[number]) => void; onEdit: (reminder: (typeof reminders)[number]) => void }) {
  return <View><SectionHeading title="Tareas y recordatorios" subtitle="Las notificaciones son opcionales y se programan en este dispositivo" onAdd={onAdd} addLabel="Programar" />{reminders.length ? reminders.map((reminder) => <View key={reminder.id} style={[styles.reminderCard, reminder.isCompleted && styles.reminderDone]}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: reminder.isCompleted }} onPress={() => onToggle(reminder)} style={[styles.check, reminder.isCompleted && styles.checked]}>{reminder.isCompleted ? <Text style={styles.checkmark}>✓</Text> : null}</Pressable><View style={styles.reminderCopy}><Text style={[styles.reminderTitle, reminder.isCompleted && styles.strike]}>{reminder.title}</Text><Text style={styles.muted}>{taskLabel(reminder.taskType)} · {formatDateTime(reminder.scheduledAt)}</Text></View>{!reminder.isCompleted ? <Pressable accessibilityRole="button" accessibilityLabel="Editar recordatorio" onPress={() => onEdit(reminder)} style={styles.smallIcon}><SymbolView name={{ android: 'edit', ios: 'pencil', web: 'edit' }} tintColor={colors.greenDark} size={15} /></Pressable> : null}<Pressable accessibilityRole="button" accessibilityLabel="Eliminar recordatorio" onPress={() => onDelete(reminder)} style={styles.smallIcon}><SymbolView name={{ android: 'delete_outline', ios: 'trash', web: 'delete_outline' }} tintColor="#AD5B52" size={15} /></Pressable></View>) : <EmptyMessage title="No hay tareas programadas" description="Añade avisos para alimentar, revisar, medir o probar tu fermento." />}</View>;
}

function CalculatorSection({ onSave }: { onSave: (description: string, measurements: FermentationMeasurement[], ingredients: FermentationIngredient[]) => void }) {
  return <View><SectionHeading title="Calculadoras de cocina" subtitle="Fórmulas transparentes para tus propios registros" />{(['starter', 'hydration', 'brine'] as const).map((type) => <CalculatorCard key={type} type={type} onSave={onSave} />)}<Text style={styles.safety}>Los resultados son cálculos de cantidades, no recomendaciones de conservación ni una evaluación de seguridad.</Text></View>;
}

function SectionHeading({ title, subtitle, onAdd, addLabel }: { title: string; subtitle?: string; onAdd?: () => void; addLabel?: string }) { return <View style={styles.sectionHeadingRow}><View style={styles.sectionHeadingCopy}><Text style={styles.sectionHeading}>{title}</Text>{subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}</View>{onAdd ? <Pressable accessibilityRole="button" onPress={onAdd} style={styles.smallButton}><Text style={styles.smallButtonText}>＋ {addLabel ?? 'Añadir'}</Text></Pressable> : null}</View>; }
function EmptyMessage({ title, description }: { title: string; description: string }) { return <View style={styles.emptyMessage}><Text style={styles.emptyMessageTitle}>{title}</Text><Text style={styles.muted}>{description}</Text></View>; }
function eventLabel(event?: FermentationEvent): string { if (!event) return 'Sin actividad registrada'; return ({ preparation: 'Preparación', feeding: 'Alimentación', measurement: 'Medición', observation: 'Observación', status_change: 'Cambio de estado', completion: 'Completado', note: 'Nota' } as Record<string, string>)[event.eventType] ?? 'Actividad'; }
function statusLabel(status: FermentationStatus): string { return fermentationStatuses.find((item) => item.id === status)?.label ?? status; }
function fieldTypeLabel(type: string): string { return ({ text: 'de texto', number: 'numérico', measurement: 'de medida', date: 'de fecha', boolean: 'sí o no' } as Record<string, string>)[type] ?? type; }
function taskLabel(type: string): string { return ({ feeding: 'Alimentación', check: 'Revisión', measurement: 'Medición', tasting: 'Evaluación', custom: 'Personalizada' } as Record<string, string>)[type] ?? type; }
function formatNumber(value: number): string { return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value); }
function formatDate(value: string): string { return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`)); }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function showError(cause: unknown): void { Alert.alert('No se pudo completar la acción', cause instanceof Error ? cause.message : 'Inténtalo de nuevo.'); }

function EventForm({ batchId, allowFeeding, onCancel, onSave }: { batchId: string | null; allowFeeding: boolean; onCancel: () => void; onSave: (input: { eventType: FermentationEventType; eventDate: string; description: string; notes: string; measurements: FermentationMeasurement[]; ingredients: FermentationIngredient[]; photoUri: string | null }) => Promise<void> }) {
  const [eventType, setEventType] = useState<FermentationEventType>('observation');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [measureName, setMeasureName] = useState('');
  const [measureValue, setMeasureValue] = useState('');
  const [measureUnit, setMeasureUnit] = useState('');
  const [eventAt, setEventAt] = useState(formatLocalSchedule(new Date().toISOString()));
  const [starter, setStarter] = useState('');
  const [ratioFlour, setRatioFlour] = useState('1');
  const [ratioWater, setRatioWater] = useState('1');
  const [flourUnit, setFlourUnit] = useState('g');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const choosePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const submit = async () => {
    setError('');
    let measurements: FermentationMeasurement[] = [];
    let ingredients: FermentationIngredient[] = [];
    let eventDescription = description.trim();
    const eventDate = parseLocalSchedule(eventAt);
    if (!eventDate) { setError('Usa el formato de fecha y hora AAAA-MM-DD HH:mm.'); return; }
    if (measureValue.trim()) {
      const value = Number(measureValue.replace(',', '.'));
      if (!Number.isFinite(value) || !measureName.trim()) { setError('Indica una medida y un valor numérico válido.'); return; }
      measurements = [{ name: measureName.trim(), value, unit: measureUnit.trim() }];
    }
    if (eventType === 'feeding') {
      const starterAmount = Number(starter.replace(',', '.'));
      const flourRatioValue = Number(ratioFlour.replace(',', '.'));
      const waterRatioValue = Number(ratioWater.replace(',', '.'));
      if (!starter.trim() || !Number.isFinite(starterAmount) || !Number.isFinite(flourRatioValue) || !Number.isFinite(waterRatioValue)) { setError('Completa la cantidad de masa madre y las dos proporciones.'); return; }
      try {
        const calculation = calculateSourdoughFeeding(starterAmount, flourRatioValue, waterRatioValue);
        ingredients = [
          { name: 'Masa madre', quantity: calculation.starter, unit: flourUnit },
          { name: 'Harina', quantity: calculation.flour, unit: flourUnit },
          { name: 'Agua', quantity: calculation.water, unit: flourUnit },
        ];
        eventDescription = `Alimentación · proporción 1:${flourRatioValue}:${waterRatioValue} · total ${formatNumber(calculation.total)} ${flourUnit}`;
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Revisa las cantidades.'); return; }
    }
    setSaving(true);
    try { await onSave({ eventType, eventDate, description: eventDescription, notes, measurements, ingredients, photoUri }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la observación.'); }
    finally { setSaving(false); }
  };

  const eventOptions: { id: FermentationEventType; label: string }[] = [
    { id: 'observation', label: 'Observación' }, ...(allowFeeding ? [{ id: 'feeding' as const, label: 'Alimentación' }] : []), { id: 'measurement', label: 'Medición' }, { id: 'note', label: 'Nota' },
  ];
  return <Modal visible animationType="slide" onRequestClose={onCancel}><View style={styles.modalScreen}><ModalHeader title="Añadir al diario" onClose={onCancel} /><ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled"><Text style={styles.label}>Tipo de registro</Text><View style={styles.typeRow}>{eventOptions.map((item) => <Pressable key={item.id} onPress={() => setEventType(item.id)} style={[styles.typeChip, eventType === item.id && styles.typeChipActive]}><Text style={[styles.typeText, eventType === item.id && styles.typeTextActive]}>{item.label}</Text></Pressable>)}</View><Field label="Fecha y hora" value={eventAt} onChangeText={setEventAt} placeholder="AAAA-MM-DD HH:mm" />
    {eventType === 'feeding' ? <><Text style={styles.label}>Proporción de alimentación</Text><View style={styles.formRow}><Field label="Masa madre" value={starter} onChangeText={setStarter} placeholder="50" keyboardType="decimal-pad" /><Field label="Harina · partes" value={ratioFlour} onChangeText={setRatioFlour} placeholder="1" keyboardType="decimal-pad" /><Field label="Agua · partes" value={ratioWater} onChangeText={setRatioWater} placeholder="1" keyboardType="decimal-pad" /></View><Field label="Unidad de peso" value={flourUnit} onChangeText={setFlourUnit} placeholder="g" /></> : null}
    {eventType === 'measurement' || eventType === 'feeding' || measureValue ? <View style={styles.formRow}><Field label="Medida opcional" value={measureName} onChangeText={setMeasureName} placeholder="Temperatura, pH…" /><Field label="Valor" value={measureValue} onChangeText={setMeasureValue} placeholder="20" keyboardType="decimal-pad" /><Field label="Unidad" value={measureUnit} onChangeText={setMeasureUnit} placeholder="°C" /></View> : null}
    {eventType !== 'feeding' ? <Field label="Descripción" value={description} onChangeText={setDescription} placeholder="Qué has observado" multiline /> : null}<Field label="Observaciones" value={notes} onChangeText={setNotes} placeholder="Aroma, textura, cambios…" multiline /><Pressable accessibilityRole="button" onPress={() => { void choosePhoto(); }} style={styles.photoPicker}><Text style={styles.outlineText}>{photoUri ? 'Foto añadida · cambiar' : 'Añadir una fotografía'}</Text></Pressable>{error ? <Text style={styles.formError}>{error}</Text> : null}<PrimaryButton title="Guardar en el diario" loading={saving} onPress={() => { void submit(); }} /></ScrollView></View></Modal>;
}

function BatchForm({ projectId, onCancel, onSave }: { projectId: string; onCancel: () => void; onSave: (batch: { name: string; startDate: string; notes: string; ingredients: FermentationIngredient[] }) => Promise<void> }) {
  const [name, setName] = useState(''); const [startDate, setStartDate] = useState(localDate()); const [notes, setNotes] = useState(''); const [ingredientText, setIngredientText] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const submit = async () => { const ingredients = ingredientText.split('\n').map((name) => name.trim()).filter(Boolean).map((name) => ({ name, quantity: null, unit: '' })); setSaving(true); try { await onSave({ name, startDate, notes, ingredients }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el lote.'); } finally { setSaving(false); } };
  return <Modal visible animationType="slide" onRequestClose={onCancel}><View style={styles.modalScreen}><ModalHeader title="Nuevo lote" onClose={onCancel} /><View style={styles.modalContent}><Text style={styles.modalIntro}>Un lote tiene su propia fecha, composición y estado.</Text><Field label="Nombre del lote" value={name} onChangeText={setName} placeholder="Ej. Kombucha de té verde · tarro 2" /><Field label="Fecha de inicio" value={startDate} onChangeText={setStartDate} placeholder="AAAA-MM-DD" /><Field label="Ingredientes, uno por línea" value={ingredientText} onChangeText={setIngredientText} placeholder="Té verde\nAgua\nCultivo" multiline /><Field label="Notas del lote" value={notes} onChangeText={setNotes} placeholder="Detalles de esta tanda" multiline />{error ? <Text style={styles.formError}>{error}</Text> : null}<PrimaryButton title="Crear lote" loading={saving} onPress={() => { void submit(); }} /></View></View></Modal>;
}

function ReminderForm({ projectId, batchId, allowFeeding, initialReminder, onCancel, onSave }: { projectId: string; batchId: string | null; allowFeeding: boolean; initialReminder: (Awaited<ReturnType<ReturnType<typeof useFermentationRepository>['listReminders']>>)[number] | null; onCancel: () => void; onSave: (input: FermentationReminderInput, id?: string) => Promise<void> }) {
  const [title, setTitle] = useState(initialReminder?.title ?? ''); const [taskType, setTaskType] = useState<FermentationTaskType>(initialReminder?.taskType ?? 'check'); const [schedule, setSchedule] = useState(initialReminder ? formatLocalSchedule(initialReminder.scheduledAt) : defaultSchedule()); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const submit = async () => { const scheduledAt = parseLocalSchedule(schedule); if (!scheduledAt) { setError('Usa el formato AAAA-MM-DD HH:mm.'); return; } if (Date.parse(scheduledAt) <= Date.now()) { setError('Elige una fecha y hora futura.'); return; } setSaving(true); try { await onSave({ projectId, batchId: initialReminder?.batchId ?? batchId, title, taskType, scheduledAt }, initialReminder?.id); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el recordatorio.'); } finally { setSaving(false); } };
  const types: { id: FermentationTaskType; label: string }[] = [...(allowFeeding ? [{ id: 'feeding' as const, label: 'Alimentar' }] : []), { id: 'check', label: 'Revisar' }, { id: 'measurement', label: 'Medir' }, { id: 'tasting', label: 'Evaluar' }, { id: 'custom', label: 'Otra tarea' }];
  return <Modal visible animationType="slide" onRequestClose={onCancel}><View style={styles.modalScreen}><ModalHeader title={initialReminder ? 'Editar recordatorio' : 'Programar recordatorio'} onClose={onCancel} /><View style={styles.modalContent}><Text style={styles.modalIntro}>Se guardará localmente y la notificación se programará en este dispositivo.</Text><Field label="Tarea" value={title} onChangeText={setTitle} placeholder="Ej. Revisar el tarro" /><Text style={styles.label}>Tipo</Text><View style={styles.typeRow}>{types.map((item) => <Pressable key={item.id} onPress={() => setTaskType(item.id)} style={[styles.typeChip, taskType === item.id && styles.typeChipActive]}><Text style={[styles.typeText, taskType === item.id && styles.typeTextActive]}>{item.label}</Text></Pressable>)}</View><Field label="Fecha y hora local" value={schedule} onChangeText={setSchedule} placeholder="AAAA-MM-DD HH:mm" /><Text style={styles.muted}>Elige una hora futura. Android puede mostrar estas notificaciones como mejor esfuerzo.</Text>{error ? <Text style={styles.formError}>{error}</Text> : null}<PrimaryButton title={initialReminder ? 'Guardar cambios' : 'Guardar tarea'} loading={saving} onPress={() => { void submit(); }} /></View></View></Modal>;
}

function FieldForm({ onCancel, onSave }: { onCancel: () => void; onSave: (field: { name: string; fieldType: FermentationCustomField['fieldType']; unit: string }) => Promise<void> }) {
  const [name, setName] = useState(''); const [unit, setUnit] = useState(''); const [fieldType, setFieldType] = useState<FermentationCustomField['fieldType']>('measurement'); const [error, setError] = useState('');
  const types: { id: FermentationCustomField['fieldType']; label: string }[] = [{ id: 'text', label: 'Texto' }, { id: 'number', label: 'Número' }, { id: 'measurement', label: 'Medida' }, { id: 'date', label: 'Fecha' }, { id: 'boolean', label: 'Sí o no' }];
  return <Modal visible animationType="slide" onRequestClose={onCancel}><View style={styles.modalScreen}><ModalHeader title="Campo personalizado" onClose={onCancel} /><View style={styles.modalContent}><Field label="Nombre del campo" value={name} onChangeText={setName} placeholder="Ej. Aumento de volumen" /><Text style={styles.label}>Tipo de dato</Text><View style={styles.typeRow}>{types.map((item) => <Pressable key={item.id} onPress={() => setFieldType(item.id)} style={[styles.typeChip, fieldType === item.id && styles.typeChipActive]}><Text style={[styles.typeText, fieldType === item.id && styles.typeTextActive]}>{item.label}</Text></Pressable>)}</View>{fieldType === 'measurement' ? <Field label="Unidad" value={unit} onChangeText={setUnit} placeholder="g, %, °C…" /> : null}{error ? <Text style={styles.formError}>{error}</Text> : null}<PrimaryButton title="Crear campo" onPress={() => { if (!name.trim()) { setError('Escribe un nombre.'); return; } void onSave({ name, unit, fieldType }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo crear el campo.')); }} /></View></View></Modal>;
}

function FieldValueForm({ field, onCancel, onSave }: { field: FermentationCustomField; onCancel: () => void; onSave: (value: string) => Promise<void> }) {
  const [value, setValue] = useState(''); const [error, setError] = useState('');
  return <Modal visible animationType="slide" onRequestClose={onCancel}><View style={styles.modalScreen}><ModalHeader title="Registrar medida" onClose={onCancel} /><View style={styles.modalContent}><Field label={`${field.name}${field.unit ? ` (${field.unit})` : ''}`} value={value} onChangeText={setValue} placeholder="Escribe el valor" keyboardType={field.fieldType === 'number' || field.fieldType === 'measurement' ? 'decimal-pad' : 'default'} />{error ? <Text style={styles.formError}>{error}</Text> : null}<PrimaryButton title="Guardar valor" onPress={() => { if (!value.trim()) { setError('Añade un valor.'); return; } void onSave(value).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo guardar.')); }} /></View></View></Modal>;
}

function EditProjectModal({ project, onCancel, onSave }: { project: FermentationProject; onCancel: () => void; onSave: (input: FermentationProjectInput) => Promise<void> }) {
  const [name, setName] = useState(project.name); const [description, setDescription] = useState(project.description); const [notes, setNotes] = useState(project.personalNotes); const [duration, setDuration] = useState(project.expectedDurationDays?.toString() ?? ''); const [temperature, setTemperature] = useState(project.temperatureNotes); const [error, setError] = useState('');
  const submit = () => { const expectedDurationDays = duration ? Number(duration) : null; if (expectedDurationDays !== null && (!Number.isInteger(expectedDurationDays) || expectedDurationDays < 1)) { setError('Indica una duración válida en días.'); return; } void onSave({ name, fermentationType: project.fermentationType, customTypeName: project.customTypeName, description, status: project.status, startDate: project.startDate, expectedDurationDays, temperatureNotes: temperature, initialPhotoUri: project.initialPhotoUri, personalNotes: notes, ingredients: project.ingredients, userId: project.userId }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el proyecto.')); };
  return <Modal visible animationType="slide" onRequestClose={onCancel}><View style={styles.modalScreen}><ModalHeader title="Editar proyecto" onClose={onCancel} /><View style={styles.modalContent}><Field label="Nombre" value={name} onChangeText={setName} placeholder="Nombre del fermento" /><Field label="Descripción" value={description} onChangeText={setDescription} placeholder="Descripción" multiline /><Field label="Duración esperada (días)" value={duration} onChangeText={setDuration} placeholder="Opcional" keyboardType="numeric" /><Field label="Notas de temperatura" value={temperature} onChangeText={setTemperature} placeholder="Opcional" multiline /><Field label="Notas personales" value={notes} onChangeText={setNotes} placeholder="Tus notas" multiline />{error ? <Text style={styles.formError}>{error}</Text> : null}<PrimaryButton title="Guardar cambios" onPress={submit} /></View></View></Modal>;
}

function CalculatorModal({ onClose, onSave }: { onClose: () => void; onSave: (description: string, measurements: FermentationMeasurement[], ingredients: FermentationIngredient[]) => void }) {
  return <Modal visible animationType="slide" onRequestClose={onClose}><View style={styles.modalScreen}><ModalHeader title="Calculadoras" onClose={onClose} /><ScrollView contentContainerStyle={styles.modalContent}><CalculatorCard type="starter" onSave={onSave} /><CalculatorCard type="hydration" onSave={onSave} /><CalculatorCard type="brine" onSave={onSave} /></ScrollView></View></Modal>;
}

function CalculatorCard({ type, onSave }: { type: 'starter' | 'hydration' | 'brine'; onSave: (description: string, measurements: FermentationMeasurement[], ingredients: FermentationIngredient[]) => void }) {
  const [first, setFirst] = useState(''); const [second, setSecond] = useState(''); const [third, setThird] = useState(''); const [result, setResult] = useState(''); const [error, setError] = useState('');
  const title = type === 'starter' ? 'Alimentación de masa madre' : type === 'hydration' ? 'Hidratación' : 'Salmuera';
  const calculate = () => {
    setError('');
    try {
      if (type === 'starter') {
        const ratio = calculateSourdoughFeeding(Number(first), Number(second), Number(third));
        setResult(`${formatNumber(ratio.flour)} g harina + ${formatNumber(ratio.water)} g agua · total ${formatNumber(ratio.total)} g`);
      } else if (type === 'hydration') setResult(`${formatNumber(calculateHydration(Number(first), Number(second)))} % de hidratación`);
      else setResult(`${formatNumber(calculateBrineSalt(Number(first), Number(second)))} g de sal`);
    } catch (cause) { setResult(''); setError(cause instanceof Error ? cause.message : 'Revisa los valores.'); }
  };
  const saveResult = () => {
    let value: number;
    let measurementName: string;
    let ingredients: FermentationIngredient[];
    if (type === 'starter') {
      const calculation = calculateSourdoughFeeding(Number(first), Number(second), Number(third));
      value = calculation.total; measurementName = 'Masa total calculada';
      ingredients = [{ name: 'Masa madre', quantity: calculation.starter, unit: 'g' }, { name: 'Harina', quantity: calculation.flour, unit: 'g' }, { name: 'Agua', quantity: calculation.water, unit: 'g' }];
    } else if (type === 'hydration') {
      value = calculateHydration(Number(first), Number(second)); measurementName = 'Hidratación';
      ingredients = [{ name: 'Harina', quantity: Number(first), unit: 'g' }, { name: 'Agua', quantity: Number(second), unit: 'g' }];
    } else {
      value = calculateBrineSalt(Number(first), Number(second)); measurementName = 'Sal calculada';
      ingredients = [{ name: 'Agua', quantity: Number(first), unit: 'g' }, { name: 'Sal', quantity: value, unit: 'g' }];
    }
    onSave(`${title} · ${result}`, [{ name: measurementName, value, unit: type === 'hydration' ? '%' : 'g' }], ingredients);
  };
  return <View style={styles.calculatorCard}><Text style={styles.calculatorTitle}>{title}</Text>{type === 'starter' ? <><Field label="Cantidad de masa madre (g)" value={first} onChangeText={setFirst} placeholder="50" keyboardType="decimal-pad" /><View style={styles.formRow}><Field label="Harina · proporción" value={second} onChangeText={setSecond} placeholder="1" keyboardType="decimal-pad" /><Field label="Agua · proporción" value={third} onChangeText={setThird} placeholder="1" keyboardType="decimal-pad" /></View><Text style={styles.formula}>Fórmula: masa madre × cada parte de la proporción.</Text></> : type === 'hydration' ? <><View style={styles.formRow}><Field label="Harina (g)" value={first} onChangeText={setFirst} placeholder="500" keyboardType="decimal-pad" /><Field label="Agua (g)" value={second} onChangeText={setSecond} placeholder="350" keyboardType="decimal-pad" /></View><Text style={styles.formula}>Fórmula: agua ÷ harina × 100.</Text></> : <><View style={styles.formRow}><Field label="Agua (g)" value={first} onChangeText={setFirst} placeholder="1000" keyboardType="decimal-pad" /><Field label="Sal deseada (%)" value={second} onChangeText={setSecond} placeholder="2" keyboardType="decimal-pad" /></View><Text style={styles.formula}>Fórmula: agua × porcentaje ÷ 100.</Text></>}
    <Pressable accessibilityRole="button" onPress={calculate} style={styles.outlineButton}><Text style={styles.outlineText}>Calcular</Text></Pressable>{error ? <Text style={styles.formError}>{error}</Text> : null}{result ? <View style={styles.calcResult}><Text style={styles.calcResultText}>{result}</Text><Pressable accessibilityRole="button" onPress={saveResult} style={styles.smallButton}><Text style={styles.smallButtonText}>Guardar en el diario</Text></Pressable></View> : null}</View>;
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) { return <View style={styles.modalHeader}><Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={styles.modalClose}><SymbolView name={{ android: 'close', ios: 'xmark', web: 'close' }} tintColor={colors.text} size={19} /></Pressable><Text style={styles.modalTitle}>{title}</Text><View style={styles.modalSpacer} /></View>; }
function Field({ label, value, onChangeText, placeholder, multiline, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean; keyboardType?: 'numeric' | 'decimal-pad' | 'default' }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.secondaryText} multiline={multiline} keyboardType={keyboardType ?? 'default'} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.input, multiline && styles.multiline]} /></View>; }
function PrimaryButton({ title, loading, onPress }: { title: string; loading?: boolean; onPress: () => void }) { return <Pressable accessibilityRole="button" disabled={loading} onPress={onPress} style={[styles.primaryButton, loading && styles.disabled]}>{loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>{title}</Text>}</Pressable>; }
function localDate(): string { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function defaultSchedule(): string { const date = new Date(Date.now() + 60 * 60 * 1000); date.setSeconds(0, 0); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; }
function formatLocalSchedule(value: string): string { const date = new Date(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; }
function parseLocalSchedule(value: string): string | null { const match = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/.exec(value.trim()); if (!match) return null; const [, year, month, day, hour, minute] = match; const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)); if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day) || date.getHours() !== Number(hour) || date.getMinutes() !== Number(minute)) return null; return date.toISOString(); }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, loader: { marginTop: 100 }, topBar: { minHeight: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 9 }, back: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.white }, backText: { color: colors.greenDark, fontSize: 12 }, topTitle: { flex: 1, color: colors.text, fontFamily: 'serif', fontSize: 17, fontWeight: '700' }, editButton: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.greenLight }, tabs: { gap: 6, paddingHorizontal: 16, paddingVertical: 8 }, tab: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.white }, tabActive: { backgroundColor: colors.greenDark }, tabText: { color: colors.secondaryText, fontSize: 9, fontWeight: '600' }, tabTextActive: { color: colors.white }, content: { paddingHorizontal: 19, paddingTop: 9, paddingBottom: 36 }, error: { margin: 12, padding: 11, color: '#994D43', backgroundColor: '#FBE7E2', borderRadius: 12, fontSize: 11 }, cover: { width: '100%', height: 174, borderRadius: 20 }, coverBlank: { width: '100%', height: 115, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.greenLight }, typeLabel: { marginTop: 16, color: colors.greenDark, fontSize: 10, fontWeight: '700' }, projectTitle: { marginTop: 4, color: colors.text, fontFamily: 'serif', fontSize: 27, fontWeight: '700' }, statusChange: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 11, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: colors.greenLight }, statusChangeText: { color: colors.greenDark, fontSize: 10, fontWeight: '700' }, infoCard: { marginTop: 14, paddingHorizontal: 13, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.white }, infoRow: { minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.background }, infoLabel: { color: colors.secondaryText, fontSize: 10 }, infoValue: { maxWidth: '58%', color: colors.text, fontSize: 10, fontWeight: '600', textAlign: 'right' }, sectionHeading: { marginTop: 16, marginBottom: 8, color: colors.text, fontFamily: 'serif', fontSize: 17, fontWeight: '700' }, ingredientLine: { minHeight: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border }, ingredientName: { color: colors.text, fontSize: 11, fontWeight: '600' }, ingredientValue: { color: colors.secondaryText, fontSize: 10 }, noteCard: { marginTop: 12, padding: 13, borderRadius: 15, backgroundColor: colors.white }, body: { marginTop: 5, color: colors.text, fontSize: 11, lineHeight: 17 }, muted: { color: colors.secondaryText, fontSize: 9, lineHeight: 14 }, quickActions: { marginTop: 17, flexDirection: 'row', justifyContent: 'space-between' }, action: { flex: 1, alignItems: 'center', gap: 5 }, actionIcon: { width: 39, height: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.greenLight }, actionLabel: { color: colors.secondaryText, fontSize: 8 }, sectionHeadingRow: { marginBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, sectionHeadingCopy: { flex: 1 }, sectionSub: { marginTop: 3, color: colors.secondaryText, fontSize: 9, lineHeight: 14 }, smallButton: { minHeight: 31, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.greenLight }, smallButtonText: { color: colors.greenDark, fontSize: 8, fontWeight: '700' }, emptyMessage: { marginTop: 8, padding: 18, borderRadius: 16, backgroundColor: colors.white }, emptyMessageTitle: { marginBottom: 5, color: colors.text, fontFamily: 'serif', fontSize: 16, fontWeight: '700' }, timelineRow: { minHeight: 75, flexDirection: 'row', gap: 10 }, timelineRail: { width: 13, alignItems: 'center' }, timelineDot: { width: 9, height: 9, marginTop: 18, borderRadius: 5, backgroundColor: colors.green }, timelineLine: { width: 1, flex: 1, backgroundColor: '#D8E3CC' }, timelineCard: { flex: 1, marginBottom: 8, padding: 11, borderRadius: 14, backgroundColor: colors.white }, timelineDate: { color: colors.secondaryText, fontSize: 8 }, timelineTitle: { marginTop: 3, color: colors.text, fontSize: 11, fontWeight: '700' }, measurementPill: { alignSelf: 'flex-start', marginTop: 6, padding: 6, borderRadius: 9, backgroundColor: colors.greenLight, color: colors.greenDark, fontSize: 9 }, customFieldCard: { marginBottom: 8, padding: 11, borderRadius: 14, backgroundColor: colors.white }, customFieldTop: { flexDirection: 'row', alignItems: 'center', gap: 6 }, customFieldCopy: { flex: 1 }, customFieldName: { color: colors.text, fontSize: 11, fontWeight: '700' }, historyLink: { marginTop: 8, color: colors.greenDark, fontSize: 9, fontWeight: '700' }, measureHistory: { marginTop: 5, color: colors.secondaryText, fontSize: 9 }, outlineButton: { minHeight: 39, marginTop: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.greenDark, borderRadius: radii.pill }, outlineText: { color: colors.greenDark, fontSize: 10, fontWeight: '700' }, photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, photoCard: { width: '48%', marginBottom: 8, padding: 7, borderRadius: 13, backgroundColor: colors.white }, photoImage: { width: '100%', height: 110, borderRadius: 10 }, photoMissing: { height: 110, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.greenLight }, photoMissingText: { color: colors.secondaryText, fontSize: 9 }, photoCaption: { marginTop: 6, color: colors.text, fontSize: 9, fontWeight: '600' }, photoDate: { marginTop: 3, color: colors.secondaryText, fontSize: 8 }, batchCard: { marginBottom: 8, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 15, backgroundColor: colors.white }, batchSelected: { borderWidth: 1, borderColor: colors.green }, batchMain: { flex: 1, flexDirection: 'row', gap: 8 }, batchIcon: { width: 33, height: 33, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.greenLight }, batchCopy: { flex: 1 }, batchName: { color: colors.text, fontSize: 11, fontWeight: '700' }, batchIngredient: { marginTop: 3, color: colors.secondaryText, fontSize: 8 }, batchActions: { alignItems: 'flex-end', gap: 6 }, smallIcon: { width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.background }, selectedBatch: { marginBottom: 8, padding: 9, alignItems: 'center', borderRadius: 11, backgroundColor: colors.greenLight }, selectedBatchText: { color: colors.greenDark, fontSize: 9, fontWeight: '700' }, statusMini: { maxWidth: 100 }, statusMiniText: { color: colors.greenDark, fontSize: 7, textAlign: 'right' }, reminderCard: { minHeight: 59, marginBottom: 7, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, backgroundColor: colors.white }, reminderDone: { opacity: 0.65 }, check: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#BEBBAF', borderRadius: 8 }, checked: { borderColor: colors.green, backgroundColor: colors.green }, checkmark: { color: colors.white, fontWeight: '700' }, reminderCopy: { flex: 1 }, reminderTitle: { color: colors.text, fontSize: 10, fontWeight: '700' }, strike: { textDecorationLine: 'line-through' }, calculatorCard: { marginBottom: 11, padding: 12, borderRadius: 16, backgroundColor: colors.white }, calculatorTitle: { marginBottom: 10, color: colors.text, fontFamily: 'serif', fontSize: 15, fontWeight: '700' }, formula: { marginBottom: 8, color: colors.secondaryText, fontSize: 8 }, calcResult: { marginTop: 9, padding: 9, borderRadius: 12, backgroundColor: colors.greenLight }, calcResultText: { marginBottom: 7, color: colors.greenDark, fontSize: 10, fontWeight: '700' }, safetyCard: { marginTop: 18, padding: 12, borderRadius: 14, backgroundColor: '#F8EDD1' }, safetyTitle: { color: '#896D31', fontSize: 9, fontWeight: '800', letterSpacing: 0.3 }, safety: { marginTop: 4, color: colors.secondaryText, fontSize: 8, lineHeight: 13 }, modalScreen: { flex: 1, backgroundColor: colors.background }, modalHeader: { minHeight: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border }, modalClose: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.white }, modalTitle: { color: colors.text, fontSize: 14, fontWeight: '700' }, modalSpacer: { width: 35 }, modalContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 34 }, modalIntro: { marginBottom: 15, color: colors.secondaryText, fontSize: 10, lineHeight: 15 }, label: { marginBottom: 6, color: colors.text, fontSize: 10, fontWeight: '700' }, field: { flex: 1, marginBottom: 12 }, input: { minHeight: 43, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white, color: colors.text, fontSize: 11 }, multiline: { minHeight: 68, paddingTop: 9, lineHeight: 16 }, formRow: { flexDirection: 'row', gap: 7 }, typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }, typeChip: { paddingHorizontal: 9, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, backgroundColor: colors.white }, typeChipActive: { borderColor: colors.greenDark, backgroundColor: colors.greenLight }, typeText: { color: colors.secondaryText, fontSize: 8 }, typeTextActive: { color: colors.greenDark, fontWeight: '700' }, photoPicker: { minHeight: 37, marginBottom: 13, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.greenLight }, formError: { marginBottom: 9, color: '#994D43', fontSize: 10 }, primaryButton: { minHeight: 45, marginTop: 7, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.greenDark }, primaryText: { color: colors.white, fontSize: 11, fontWeight: '700' }, disabled: { opacity: 0.6 },
});

