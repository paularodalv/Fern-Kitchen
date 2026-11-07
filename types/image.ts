export type ImageCategory = 'recipe' | 'fermentation' | 'pantry' | 'profile' | 'note' | 'meal';

export type AppImage = {
  id: string;
  ownerUserId: string | null;
  localUri: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  category: ImageCategory;
  createdAt: string;
  updatedAt: string;
};

export type ImageAssociation = {
  id: string;
  imageId: string;
  entityType: string;
  entityId: string;
  role: string;
  position: number;
  createdAt: string;
};
