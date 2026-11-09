export type FermentationStatus = 'planned' | 'active' | 'observing' | 'paused' | 'completed' | 'discarded';
export type FermentationEventType = 'preparation' | 'feeding' | 'measurement' | 'observation' | 'status_change' | 'completion' | 'note';
export type FermentationTaskType = 'feeding' | 'check' | 'measurement' | 'tasting' | 'custom';
export type FermentationFieldType = 'text' | 'number' | 'measurement' | 'date' | 'boolean';

export type FermentationIngredient = { id?: string; name: string; quantity: number | null; unit: string };
export type FermentationMeasurement = { name: string; value: number; unit: string };

export type FermentationProjectInput = {
  name: string;
  fermentationType: string;
  customTypeName: string | null;
  description: string;
  status: FermentationStatus;
  startDate: string;
  expectedDurationDays: number | null;
  temperatureNotes: string;
  initialPhotoUri: string | null;
  personalNotes: string;
  ingredients: FermentationIngredient[];
  userId?: string | null;
  ownerUserId?: string | null;
};

export type FermentationProject = FermentationProjectInput & {
  id: string;
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
  currentStage: string | null;
  nextReminder: FermentationReminder | null;
  latestEvent: FermentationEvent | null;
};

export type FermentationBatchInput = {
  projectId: string;
  name: string;
  startDate: string;
  completionDate: string | null;
  status: FermentationStatus;
  notes: string;
  ingredients: FermentationIngredient[];
};

export type FermentationBatch = FermentationBatchInput & { id: string; createdAt: string; updatedAt: string };

export type FermentationEventInput = {
  projectId: string;
  batchId: string | null;
  eventType: FermentationEventType;
  eventDate: string;
  description: string;
  measurements: FermentationMeasurement[];
  ingredients: FermentationIngredient[];
  notes: string;
};

export type FermentationEvent = FermentationEventInput & { id: string; createdAt: string };

export type FermentationReminderInput = {
  projectId: string;
  batchId: string | null;
  title: string;
  taskType: FermentationTaskType;
  scheduledAt: string;
};

export type FermentationReminder = FermentationReminderInput & {
  id: string;
  notificationId: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FermentationPhotoInput = { projectId: string; batchId: string | null; eventId: string | null; localUri: string; caption: string };
export type FermentationPhoto = FermentationPhotoInput & { id: string; createdAt: string };
export type FermentationCustomFieldInput = { projectId: string; batchId: string | null; name: string; fieldType: FermentationFieldType; unit: string };
export type FermentationCustomField = FermentationCustomFieldInput & { id: string; createdAt: string };
export type FermentationCustomFieldValue = { id: string; fieldId: string; eventId: string; value: string; recordedAt: string; createdAt: string };
