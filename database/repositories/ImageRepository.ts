import type { SQLiteDatabase } from 'expo-sqlite';
import type { AppImage, ImageCategory } from '@/types/image';
import type { ImportedImageFile } from '@/services/ImageStorageService';

const selectColumns = `id, owner_user_id AS ownerUserId, local_uri AS localUri, original_filename AS originalFilename,
  mime_type AS mimeType, file_size AS fileSize, width, height, category, created_at AS createdAt, updated_at AS updatedAt`;

export class ImageRepository {
  constructor(private readonly database: SQLiteDatabase, private readonly createUuid: () => string) {}

  async register(input: ImportedImageFile): Promise<AppImage> {
    const timestamp = new Date().toISOString();
    await this.database.runAsync(`INSERT INTO app_images(id,owner_user_id,local_uri,original_filename,mime_type,file_size,width,height,category,created_at,updated_at)
      VALUES(?,NULL,?,?,?,?,?,?,?,?,?);`, input.id, input.localUri, input.originalFilename, input.mimeType, input.fileSize, input.width, input.height, input.category, timestamp, timestamp);
    const image = await this.getById(input.id);
    if (!image) throw new Error('No se pudo guardar la fotografía en la biblioteca.');
    return image;
  }

  async getById(id: string): Promise<AppImage | null> {
    return this.database.getFirstAsync<AppImage>(`SELECT ${selectColumns} FROM app_images WHERE id=?;`, id);
  }

  async getByUri(uri: string): Promise<AppImage | null> {
    return this.database.getFirstAsync<AppImage>(`SELECT ${selectColumns} FROM app_images WHERE local_uri=?;`, uri);
  }

  async list(category?: ImageCategory): Promise<AppImage[]> {
    return this.database.getAllAsync<AppImage>(`SELECT ${selectColumns} FROM app_images ${category ? 'WHERE category=?' : ''} ORDER BY created_at DESC;`, ...(category ? [category] : []));
  }

  async listUnused(): Promise<AppImage[]> {
    return this.database.getAllAsync<AppImage>(`SELECT ${selectColumns} FROM app_images i
      WHERE NOT EXISTS(SELECT 1 FROM image_associations a WHERE a.image_id=i.id)
      AND NOT EXISTS(SELECT 1 FROM recipes WHERE image_local_uri=i.local_uri)
      AND NOT EXISTS(SELECT 1 FROM fermentation_projects WHERE initial_photo_uri=i.local_uri)
      AND NOT EXISTS(SELECT 1 FROM fermentation_photos WHERE local_uri=i.local_uri)
      AND NOT EXISTS(SELECT 1 FROM pantry_items WHERE image_local_uri=i.local_uri)
      AND NOT EXISTS(SELECT 1 FROM meal_plan_entries WHERE custom_meal_image_uri=i.local_uri)
      AND NOT EXISTS(SELECT 1 FROM collection_profiles WHERE photo_local_uri=i.local_uri)
      ORDER BY created_at DESC;`);
  }

  async listForEntity(entityType: string, entityId: string, role?: string): Promise<AppImage[]> {
    return this.database.getAllAsync<AppImage>(`SELECT i.id, i.owner_user_id AS ownerUserId, i.local_uri AS localUri, i.original_filename AS originalFilename,
      i.mime_type AS mimeType, i.file_size AS fileSize, i.width, i.height, i.category, i.created_at AS createdAt, i.updated_at AS updatedAt
      FROM app_images i JOIN image_associations a ON a.image_id=i.id WHERE a.entity_type=? AND a.entity_id=? ${role ? 'AND a.role=?' : ''} ORDER BY a.position,a.created_at;`, ...(role ? [entityType, entityId, role] : [entityType, entityId]));
  }

  async associate(imageId: string, entityType: string, entityId: string, role: string, position = 0): Promise<void> {
    await this.database.runAsync('INSERT OR IGNORE INTO image_associations(id,image_id,entity_type,entity_id,role,position,created_at) VALUES(?,?,?,?,?,?,?);', this.createUuid(), imageId, entityType, entityId, role, position, new Date().toISOString());
  }

  async associateByUri(uri: string | null, entityType: string, entityId: string, role: string, position = 0): Promise<void> {
    if (!uri) return;
    const image = await this.getByUri(uri);
    if (image) await this.associate(image.id, entityType, entityId, role, position);
  }

  async replaceAssociation(imageId: string | null, entityType: string, entityId: string, role: string): Promise<void> {
    await this.database.runAsync('DELETE FROM image_associations WHERE entity_type=? AND entity_id=? AND role=?;', entityType, entityId, role);
    if (imageId) await this.associate(imageId, entityType, entityId, role);
  }

  async removeAssociation(associationId: string): Promise<void> {
    await this.database.runAsync('DELETE FROM image_associations WHERE id=?;', associationId);
  }

  async clearAssociations(entityType: string, entityId: string, role: string): Promise<void> {
    await this.database.runAsync('DELETE FROM image_associations WHERE entity_type=? AND entity_id=? AND role=?;', entityType, entityId, role);
  }

  async isReferenced(imageId: string): Promise<boolean> {
    const image = await this.getById(imageId);
    if (!image) return false;
    const [links, references] = await Promise.all([
      this.database.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM image_associations WHERE image_id=?;', imageId),
      this.database.getFirstAsync<{ count: number }>(`SELECT
        (SELECT COUNT(*) FROM recipes WHERE image_local_uri=?) +
        (SELECT COUNT(*) FROM fermentation_projects WHERE initial_photo_uri=?) +
        (SELECT COUNT(*) FROM fermentation_photos WHERE local_uri=?) +
        (SELECT COUNT(*) FROM pantry_items WHERE image_local_uri=?) +
        (SELECT COUNT(*) FROM meal_plan_entries WHERE custom_meal_image_uri=?) +
        (SELECT COUNT(*) FROM collection_profiles WHERE photo_local_uri=?) AS count;`, image.localUri, image.localUri, image.localUri, image.localUri, image.localUri, image.localUri),
    ]);
    return (links?.count ?? 0) + (references?.count ?? 0) > 0;
  }

  async removeRecordIfUnused(imageId: string): Promise<boolean> {
    if (await this.isReferenced(imageId)) return false;
    const result = await this.database.runAsync('DELETE FROM app_images WHERE id=?;', imageId);
    return result.changes > 0;
  }

}
