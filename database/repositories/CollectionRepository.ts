import type { SQLiteDatabase } from 'expo-sqlite';
import { ACHIEVEMENTS, COSMETICS, EVENTS, LEVELS, RECIPE_DESIGNS, STICKERS, STICKER_COLLECTIONS } from '../../features/collection/catalog.ts';

export type CollectionAction = 'prepared_recipe' | 'personal_recipe' | 'fermentation_event' | 'fermentation_completed' | 'autumn_recipe' | 'summer_recipe';
export type CollectionSnapshot = { profileId: string; displayName: string; xp: number; level: number; nextThreshold: number | null; achievements: Array<{ id: string; name: string; description: string; category: string; icon: string; hint: string; xpReward: number; isCompleted: boolean; unlockedAt: string | null }>; stickers: Array<{ id: string; name: string; description: string; collectionId: string; icon: string; rarity: string; unlockedAt: string | null }>; events: Array<{ id: string; title: string; description: string; startsAt: string; endsAt: string; icon: string; rewardLabel: string; challenges: Array<{ id: string; title: string; description: string; targetCount: number; rewardXp: number; stickerId: string | null; progress: number; isCompleted: boolean }> }>; cosmetics: Array<{ id: string; kind: string; name: string; description: string; icon: string; isOwned: boolean }>; customization: { frameId: string | null; backgroundId: string | null; accessoryId: string | null; displayedAchievementId: string | null; displayedStickerId: string | null }; designs: Array<{ id: string; name: string; description: string; accentColor: string; backgroundColor: string; icon: string; unlockType: string; unlockValue: string; isOwned: boolean }>; defaultDesignId: string };

const now = () => new Date().toISOString();
const formatLocalDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const collectionCatalogVersion = '1';
const uuid = () => globalThis.crypto.randomUUID();

export class CollectionRepository {
  constructor(private readonly database: SQLiteDatabase, private readonly createUuid: () => string = uuid) {}

  async initialize(): Promise<void> {
    const timestamp = now();
    await this.database.withTransactionAsync(async () => {
      const profile = await this.database.getFirstAsync<{ id: string }>('SELECT id FROM collection_profiles LIMIT 1;');
      const profileId = profile?.id ?? this.createUuid();
      if (!profile) {
        await this.database.runAsync('INSERT INTO collection_profiles(id, user_id, display_name, created_at, updated_at) VALUES(?, NULL, ?, ?, ?);', profileId, 'Mi cocina', timestamp, timestamp);
        await this.database.runAsync('INSERT INTO user_progress(profile_id, total_xp, updated_at) VALUES(?, 0, ?);', profileId, timestamp);
      }
      const seededVersion = await this.database.getFirstAsync<{ value: string }>("SELECT value FROM app_metadata WHERE key='collection_catalog_version';");
      if (seededVersion?.value !== collectionCatalogVersion) {
      for (const item of ACHIEVEMENTS) await this.database.runAsync('INSERT INTO achievement_definitions(id,name,description,category,icon,hint,xp_reward,sort_order) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,category=excluded.category,icon=excluded.icon,hint=excluded.hint,xp_reward=excluded.xp_reward,sort_order=excluded.sort_order;', item.id,item.name,item.description,item.category,item.icon,item.hint,item.xp,item.sort);
      for (const item of STICKER_COLLECTIONS) await this.database.runAsync('INSERT INTO sticker_collection_definitions(id,name,description,completion_reward,sort_order) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,completion_reward=excluded.completion_reward,sort_order=excluded.sort_order;',item.id,item.name,item.description,item.reward,item.sort);
      for (const item of STICKERS) await this.database.runAsync('INSERT INTO sticker_definitions(id,collection_id,name,description,asset_path,icon,unlock_type,unlock_value,rarity,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET collection_id=excluded.collection_id,name=excluded.name,description=excluded.description,asset_path=excluded.asset_path,icon=excluded.icon,unlock_type=excluded.unlock_type,unlock_value=excluded.unlock_value,rarity=excluded.rarity,sort_order=excluded.sort_order;', item.id,item.collection,item.name,item.description,item.assetPath,item.icon,item.unlockType,item.unlockValue,item.rarity,item.sort);
      for (const item of COSMETICS) await this.database.runAsync('INSERT INTO cosmetic_definitions(id,kind,name,description,asset_path,icon,is_default,unlock_type,unlock_value) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,name=excluded.name,description=excluded.description,asset_path=excluded.asset_path,icon=excluded.icon,is_default=excluded.is_default,unlock_type=excluded.unlock_type,unlock_value=excluded.unlock_value;', item.id,item.kind,item.name,item.description,'',item.icon,item.default ? 1 : 0,item.unlockType ?? 'default',item.unlockValue ?? '');
      }
      await this.database.runAsync('INSERT OR IGNORE INTO user_customization(profile_id, frame_id, background_id, accessory_id, updated_at) VALUES(?, ?, ?, ?, ?);', profileId, 'frame-fern', 'background-cream', 'accessory-flower', timestamp);
      if (seededVersion?.value !== collectionCatalogVersion) {
      for (const item of RECIPE_DESIGNS) await this.database.runAsync('INSERT INTO recipe_design_definitions(id,name,description,accent_color,background_color,icon,unlock_type,unlock_value,sort_order) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,accent_color=excluded.accent_color,background_color=excluded.background_color,icon=excluded.icon,unlock_type=excluded.unlock_type,unlock_value=excluded.unlock_value,sort_order=excluded.sort_order;', item.id,item.name,item.description,item.accent,item.background,item.icon,item.unlock,item.value,item.sort);
      for (const event of EVENTS) {
        await this.database.runAsync('INSERT INTO seasonal_event_definitions(id,title,description,starts_at,ends_at,banner_asset,icon,reward_label) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,starts_at=excluded.starts_at,ends_at=excluded.ends_at,banner_asset=excluded.banner_asset,icon=excluded.icon,reward_label=excluded.reward_label;', event.id,event.title,event.description,event.starts,event.ends,'',event.icon,event.reward);
        await this.database.runAsync('INSERT INTO seasonal_event_challenges(id,event_id,title,description,action_type,target_count,reward_xp,sticker_id,sort_order) VALUES(?,?,?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET event_id=excluded.event_id,title=excluded.title,description=excluded.description,action_type=excluded.action_type,target_count=excluded.target_count,reward_xp=excluded.reward_xp,sticker_id=excluded.sticker_id,sort_order=excluded.sort_order;', event.challenge.id,event.id,event.challenge.title,event.challenge.description,event.challenge.action,event.challenge.target,event.challenge.xp,event.challenge.sticker);
      }
      await this.database.runAsync("INSERT INTO app_metadata(key,value) VALUES('collection_catalog_version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value;",collectionCatalogVersion);
      }
      for (const item of await this.database.getAllAsync<{ id: string }>('SELECT id FROM cosmetic_definitions WHERE is_default=1;')) await this.database.runAsync('INSERT OR IGNORE INTO user_cosmetics(id,profile_id,cosmetic_id,unlocked_at) VALUES(?,?,?,?);',this.createUuid(),profileId,item.id,timestamp);
      for (const item of ACHIEVEMENTS) await this.database.runAsync('INSERT OR IGNORE INTO user_achievements(id,profile_id,achievement_id) VALUES(?,?,?);',this.createUuid(),profileId,item.id);
      const challengeRows = await this.database.getAllAsync<{ id: string }>('SELECT id FROM seasonal_event_challenges;');
      for (const item of challengeRows) await this.database.runAsync('INSERT OR IGNORE INTO user_event_progress(id,profile_id,challenge_id) VALUES(?,?,?);',this.createUuid(),profileId,item.id);
    });
  }

  async getSnapshot(): Promise<CollectionSnapshot> {
    await this.initialize();
    const profile = await this.database.getFirstAsync<{ id: string; displayName: string; xp: number }>('SELECT p.id,p.display_name AS displayName,COALESCE(x.total_xp,0) AS xp FROM collection_profiles p LEFT JOIN user_progress x ON x.profile_id=p.id LIMIT 1;');
    if (!profile) throw new Error('No se pudo abrir la colección local.');
    const levelIndex = Math.max(0, LEVELS.findIndex((item, index) => profile.xp >= item.threshold && (LEVELS[index + 1] === undefined || profile.xp < LEVELS[index + 1].threshold)));
    const achievements = await this.database.getAllAsync<CollectionSnapshot['achievements'][number]>(`SELECT d.id,d.name,d.description,d.category,d.icon,d.hint,d.xp_reward AS xpReward,COALESCE(u.is_completed,0) AS isCompleted,u.unlocked_at AS unlockedAt FROM achievement_definitions d LEFT JOIN user_achievements u ON u.achievement_id=d.id AND u.profile_id=? ORDER BY d.sort_order;`, profile.id);
    const stickers = await this.database.getAllAsync<CollectionSnapshot['stickers'][number]>(`SELECT d.id,d.name,d.description,d.collection_id AS collectionId,d.icon,d.rarity,u.unlocked_at AS unlockedAt FROM sticker_definitions d LEFT JOIN user_stickers u ON u.sticker_id=d.id AND u.profile_id=? ORDER BY d.collection_id,d.sort_order;`, profile.id);
    const cosmetics = await this.database.getAllAsync<CollectionSnapshot['cosmetics'][number]>(`SELECT d.id,d.kind,d.name,d.description,d.icon,EXISTS(SELECT 1 FROM user_cosmetics u WHERE u.cosmetic_id=d.id AND u.profile_id=?) AS isOwned FROM cosmetic_definitions d ORDER BY d.kind,d.is_default DESC,d.name;`, profile.id);
    const customization = await this.database.getFirstAsync<CollectionSnapshot['customization']>('SELECT frame_id AS frameId,background_id AS backgroundId,accessory_id AS accessoryId,displayed_achievement_id AS displayedAchievementId,displayed_sticker_id AS displayedStickerId FROM user_customization WHERE profile_id=?;', profile.id);
    const rawEvents = await this.database.getAllAsync<{ id: string; title: string; description: string; startsAt: string; endsAt: string; icon: string; rewardLabel: string }>('SELECT id,title,description,starts_at AS startsAt,ends_at AS endsAt,icon,reward_label AS rewardLabel FROM seasonal_event_definitions ORDER BY starts_at DESC;');
    const events: CollectionSnapshot['events'] = [];
    for (const event of rawEvents) {
      const challenges = await this.database.getAllAsync<CollectionSnapshot['events'][number]['challenges'][number]>(`SELECT c.id,c.title,c.description,c.target_count AS targetCount,c.reward_xp AS rewardXp,c.sticker_id AS stickerId,COALESCE(p.progress,0) AS progress,COALESCE(p.is_completed,0) AS isCompleted FROM seasonal_event_challenges c LEFT JOIN user_event_progress p ON p.challenge_id=c.id AND p.profile_id=? WHERE c.event_id=? ORDER BY c.sort_order;`, profile.id,event.id);
      events.push({ ...event, challenges });
    }
    const designs = await this.database.getAllAsync<CollectionSnapshot['designs'][number]>(`SELECT d.id,d.name,d.description,d.accent_color AS accentColor,d.background_color AS backgroundColor,d.icon,d.unlock_type AS unlockType,d.unlock_value AS unlockValue,CASE WHEN d.unlock_type='default' THEN 1 WHEN d.unlock_type='level' AND ? >= CAST(d.unlock_value AS INTEGER) THEN 1 WHEN d.unlock_type='achievement' AND EXISTS(SELECT 1 FROM user_achievements a JOIN achievement_definitions ad ON ad.id=a.achievement_id WHERE a.profile_id=? AND a.is_completed=1 AND ad.id=d.unlock_value) THEN 1 WHEN d.unlock_type='event' AND EXISTS(SELECT 1 FROM user_event_rewards r WHERE r.profile_id=? AND r.event_id=d.unlock_value) THEN 1 ELSE EXISTS(SELECT 1 FROM user_cosmetics c WHERE c.profile_id=? AND c.cosmetic_id=d.id) END AS isOwned FROM recipe_design_definitions d ORDER BY d.sort_order;`, levelIndex + 1,profile.id,profile.id,profile.id);
    const defaultDesign = await this.database.getFirstAsync<{ designId: string }>('SELECT design_id AS designId FROM recipe_design_selections WHERE profile_id=? AND recipe_id IS NULL;', profile.id);
    return { profileId: profile.id,displayName: profile.displayName,xp: profile.xp,level: levelIndex + 1,nextThreshold: LEVELS[levelIndex + 1]?.threshold ?? null,achievements,stickers,events,cosmetics,customization: customization ?? { frameId: null,backgroundId: null,accessoryId: null,displayedAchievementId: null,displayedStickerId: null },designs,defaultDesignId: defaultDesign?.designId ?? 'classic' };
  }

  async recordAction(action: CollectionAction, sourceId: string): Promise<string[]> {
    await this.initialize();
    const snapshot = await this.database.getFirstAsync<{ id: string }>('SELECT id FROM collection_profiles LIMIT 1;');
    if (!snapshot) return [];
    const baseXp: Record<CollectionAction, number> = { prepared_recipe: 25,personal_recipe: 20,fermentation_event: 5,fermentation_completed: 35,autumn_recipe: 5,summer_recipe: 5 };
    const actionKey = action === 'prepared_recipe' || action === 'personal_recipe' || action === 'fermentation_completed' ? `${action}:${sourceId}` : `${action}:${sourceId}`;
    const timestamp = now();
    const newlyUnlocked: string[] = [];
    await this.database.withTransactionAsync(async () => {
      const actionResult = await this.database.runAsync('INSERT OR IGNORE INTO collection_actions(id,profile_id,user_id,action_type,source_id,created_at) VALUES(?,?,NULL,?,?,?);',this.createUuid(),snapshot.id,action,sourceId,timestamp);
      const awardAction = async () => {
        const result = await this.database.runAsync('INSERT OR IGNORE INTO experience_events(id,profile_id,event_type,source_type,source_id,action_key,xp_delta,created_at) VALUES(?,?,?,?,?,?,?,?);',this.createUuid(),snapshot.id,action,action.startsWith('fermentation')?'fermentation':'recipe',sourceId,actionKey,baseXp[action],timestamp);
        if (result.changes) await this.database.runAsync('UPDATE user_progress SET total_xp=total_xp+?,updated_at=? WHERE profile_id=?;',baseXp[action],timestamp,snapshot.id);
      };
      if (actionResult.changes) {
        let canAwardAction = true;
        if (action === 'fermentation_event') {
          const recent = await this.database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM experience_events WHERE event_type='fermentation_event' AND created_at>=?;",new Date(Date.now()-7*24*60*60*1000).toISOString());
          canAwardAction = (recent?.count ?? 0) < 3;
        }
        if (canAwardAction) await awardAction();
      }
      const count = async (actionType: string) => (await this.database.getFirstAsync<{ count: number }>('SELECT COUNT(DISTINCT source_id) AS count FROM collection_actions WHERE profile_id=? AND action_type=?;',snapshot.id,actionType))?.count ?? 0;
      const prepared = await count('prepared_recipe');
      const personal = await count('personal_recipe');
      const fermentation = await count('fermentation_event') + await count('fermentation_completed');
      const completedFerment = await count('fermentation_completed');
      const achievementProgress: Record<string, number> = { 'first-prepared-recipe': prepared, 'first-personal-recipe': personal, 'first-fermentation': fermentation, 'completed-fermentation': completedFerment, 'three-recipes-prepared': prepared, 'autumn-cook': await count('autumn_recipe') };
      for (const [achievementId, progress] of Object.entries(achievementProgress)) {
        const definition = await this.database.getFirstAsync<{ xpReward: number; name: string }>('SELECT xp_reward AS xpReward,name FROM achievement_definitions WHERE id=?;',achievementId);
        const threshold = achievementId === 'three-recipes-prepared' ? 3 : 1;
        const unlock = progress >= threshold;
        const previous = await this.database.getFirstAsync<{ isCompleted: number }>('SELECT is_completed AS isCompleted FROM user_achievements WHERE profile_id=? AND achievement_id=?;',snapshot.id,achievementId);
        await this.database.runAsync('UPDATE user_achievements SET progress=?,is_completed=?,unlocked_at=CASE WHEN ?=1 AND unlocked_at IS NULL THEN ? ELSE unlocked_at END WHERE profile_id=? AND achievement_id=?;',progress,unlock ? 1 : 0,unlock ? 1 : 0,timestamp,snapshot.id,achievementId);
        if (unlock && !previous?.isCompleted) {
          if (definition) newlyUnlocked.push(definition.name);
          const rewardKey = `achievement:${achievementId}`;
          const awarded = await this.database.runAsync('INSERT OR IGNORE INTO experience_events(id,profile_id,event_type,source_type,source_id,action_key,xp_delta,created_at) VALUES(?,?,?,?,?,?,?,?);',this.createUuid(),snapshot.id,'achievement_reward','achievement',achievementId,rewardKey,definition?.xpReward ?? 0,timestamp);
          if (awarded.changes && (definition?.xpReward ?? 0) > 0) await this.database.runAsync('UPDATE user_progress SET total_xp=total_xp+?,updated_at=? WHERE profile_id=?;',definition!.xpReward,timestamp,snapshot.id);
        }
      }
      newlyUnlocked.push(...await this.updateEventProgress(snapshot.id,action,sourceId,timestamp));
      const stickerUnlocks = await this.database.getAllAsync<{ id: string; unlockType: string; unlockValue: string }>('SELECT id,unlock_type AS unlockType,unlock_value AS unlockValue FROM sticker_definitions;');
      for (const sticker of stickerUnlocks) {
        const earned = (sticker.unlockType === 'prepared' && prepared > 0) || (sticker.unlockType === 'recipe' && personal > 0) || (sticker.unlockType === 'fermentation' && fermentation > 0) || (sticker.unlockType === 'level' && Number(sticker.unlockValue) <= 2 && (await this.currentLevel(snapshot.id)) >= Number(sticker.unlockValue)) || (sticker.unlockType === 'event' && await this.database.getFirstAsync('SELECT 1 FROM user_event_rewards WHERE profile_id=? AND event_id=?;',snapshot.id,sticker.unlockValue) !== null);
        if (earned) await this.database.runAsync('INSERT OR IGNORE INTO user_stickers(id,profile_id,sticker_id,unlocked_at) VALUES(?,?,?,?);',this.createUuid(),snapshot.id,sticker.id,timestamp);
      }
      for (const collection of STICKER_COLLECTIONS) {
        const total = await this.database.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM sticker_definitions WHERE collection_id=?;',collection.id);
        const unlocked = await this.database.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM user_stickers u JOIN sticker_definitions d ON d.id=u.sticker_id WHERE u.profile_id=? AND d.collection_id=?;',snapshot.id,collection.id);
        if ((total?.count ?? 0) > 0 && total?.count === unlocked?.count) {
          const rewards = await this.database.getAllAsync<{ id: string }>("SELECT id FROM cosmetic_definitions WHERE unlock_type='sticker_collection' AND unlock_value=?;",collection.id);
          for (const reward of rewards) await this.database.runAsync('INSERT OR IGNORE INTO user_cosmetics(id,profile_id,cosmetic_id,unlocked_at) VALUES(?,?,?,?);',this.createUuid(),snapshot.id,reward.id,timestamp);
        }
      }
      const level = await this.currentLevel(snapshot.id);
      const levelRewards = await this.database.getAllAsync<{ id: string }>("SELECT id FROM cosmetic_definitions WHERE unlock_type='level' AND CAST(unlock_value AS INTEGER)<=?;",level);
      for (const reward of levelRewards) {
        const unlocked = await this.database.runAsync('INSERT OR IGNORE INTO user_cosmetics(id,profile_id,cosmetic_id,unlocked_at) VALUES(?,?,?,?);',this.createUuid(),snapshot.id,reward.id,timestamp);
        if (unlocked.changes) newlyUnlocked.push((await this.database.getFirstAsync<{ name: string }>('SELECT name FROM cosmetic_definitions WHERE id=?;',reward.id))?.name ?? 'Un detalle nuevo');
      }
    });
    return newlyUnlocked;
  }

  private async currentLevel(profileId: string): Promise<number> {
    const row = await this.database.getFirstAsync<{ xp: number }>('SELECT total_xp AS xp FROM user_progress WHERE profile_id=?;',profileId);
    return Math.max(1,LEVELS.filter((level) => (row?.xp ?? 0) >= level.threshold).length);
  }

  private async updateEventProgress(profileId: string, action: CollectionAction, sourceId: string, timestamp: string): Promise<string[]> {
    const rewardsUnlocked: string[] = [];
    const actionMap: Record<CollectionAction, string> = { prepared_recipe: 'prepared_recipe',personal_recipe: 'personal_recipe',fermentation_event: 'fermentation_event',fermentation_completed: 'fermentation_completed',autumn_recipe: 'autumn_recipe',summer_recipe: 'summer_recipe' };
    const eventDate = formatLocalDate(new Date(timestamp));
    const challenges = await this.database.getAllAsync<{ id: string; eventId: string; actionType: string; targetCount: number; rewardXp: number; stickerId: string | null }>('SELECT c.id,c.event_id AS eventId,c.action_type AS actionType,c.target_count AS targetCount,c.reward_xp AS rewardXp,c.sticker_id AS stickerId FROM seasonal_event_challenges c JOIN seasonal_event_definitions e ON e.id=c.event_id WHERE e.starts_at<=? AND e.ends_at>=?;',eventDate,eventDate);
    for (const challenge of challenges) {
      if (challenge.actionType !== actionMap[action]) continue;
      const logged = await this.database.runAsync('INSERT OR IGNORE INTO user_event_actions(id,profile_id,user_id,challenge_id,source_id,created_at) VALUES(?,?,NULL,?,?,?);',this.createUuid(),profileId,challenge.id,sourceId,timestamp);
      if (!logged.changes) continue;
      const update = await this.database.runAsync('UPDATE user_event_progress SET progress=MIN(progress+1,?),is_completed=CASE WHEN progress+1>=? THEN 1 ELSE 0 END,completed_at=CASE WHEN progress+1>=? AND completed_at IS NULL THEN ? ELSE completed_at END WHERE profile_id=? AND challenge_id=? AND is_completed=0;',challenge.targetCount,challenge.targetCount,challenge.targetCount,timestamp,profileId,challenge.id);
      if (!update.changes) continue;
      const current = await this.database.getFirstAsync<{ done: number }>('SELECT is_completed AS done FROM user_event_progress WHERE profile_id=? AND challenge_id=?;',profileId,challenge.id);
      if (current?.done) {
        const eventReward = await this.database.runAsync('INSERT OR IGNORE INTO user_event_rewards(id,profile_id,event_id,reward_key,unlocked_at) VALUES(?,?,?,?,?);',this.createUuid(),profileId,challenge.eventId,`challenge:${challenge.id}`,timestamp);
        if (eventReward.changes && challenge.rewardXp > 0) {
          await this.database.runAsync('INSERT OR IGNORE INTO experience_events(id,profile_id,event_type,source_type,source_id,action_key,xp_delta,created_at) VALUES(?,?,?,?,?,?,?,?);',this.createUuid(),profileId,'event_reward','event',challenge.id,`event:${challenge.id}`,challenge.rewardXp,timestamp);
          await this.database.runAsync('UPDATE user_progress SET total_xp=total_xp+?,updated_at=? WHERE profile_id=?;',challenge.rewardXp,timestamp,profileId);
        }
        if (challenge.stickerId) await this.database.runAsync('INSERT OR IGNORE INTO user_stickers(id,profile_id,sticker_id,unlocked_at) VALUES(?,?,?,?);',this.createUuid(),profileId,challenge.stickerId,timestamp);
        if (eventReward.changes) rewardsUnlocked.push((await this.database.getFirstAsync<{ title: string }>('SELECT title FROM seasonal_event_definitions WHERE id=?;',challenge.eventId))?.title ?? 'Reto completado');
      }
    }
    return rewardsUnlocked;
  }

  async equipCosmetic(kind: 'frame' | 'background' | 'accessory', cosmeticId: string): Promise<void> {
    await this.initialize();
    const profile = await this.database.getFirstAsync<{ id: string }>('SELECT id FROM collection_profiles LIMIT 1;');
    if (!profile) throw new Error('No se encontró el perfil local.');
    const owned = await this.database.getFirstAsync('SELECT 1 FROM user_cosmetics u JOIN cosmetic_definitions d ON d.id=u.cosmetic_id WHERE u.profile_id=? AND u.cosmetic_id=? AND d.kind=?;',profile.id,cosmeticId,kind);
    if (!owned) throw new Error('Ese detalle aún no está desbloqueado.');
    const column = kind === 'frame' ? 'frame_id' : kind === 'background' ? 'background_id' : 'accessory_id';
    await this.database.runAsync(`UPDATE user_customization SET ${column}=?,updated_at=? WHERE profile_id=?;`,cosmeticId,now(),profile.id);
  }

  async setDisplayedReward(kind: 'achievement' | 'sticker', rewardId: string | null): Promise<void> {
    await this.initialize();
    const profile = await this.database.getFirstAsync<{ id: string }>('SELECT id FROM collection_profiles LIMIT 1;');
    if (!profile) return;
    if (rewardId) {
      const table = kind === 'achievement' ? 'user_achievements' : 'user_stickers';
      const field = kind === 'achievement' ? 'achievement_id' : 'sticker_id';
      const unlocked = kind === 'achievement' ? 'is_completed=1 AND ' : '';
      if (!await this.database.getFirstAsync(`SELECT 1 FROM ${table} WHERE profile_id=? AND ${field}=? AND ${unlocked}1=1;`,profile.id,rewardId)) throw new Error('Ese distintivo aún no está desbloqueado.');
    }
    const column = kind === 'achievement' ? 'displayed_achievement_id' : 'displayed_sticker_id';
    await this.database.runAsync(`UPDATE user_customization SET ${column}=?,updated_at=? WHERE profile_id=?;`,rewardId,now(),profile.id);
  }

  async resetCustomization(): Promise<void> {
    const snapshot = await this.getSnapshot();
    await this.database.runAsync('UPDATE user_customization SET frame_id=?,background_id=?,accessory_id=?,displayed_achievement_id=NULL,displayed_sticker_id=NULL,updated_at=? WHERE profile_id=?;','frame-fern','background-cream','accessory-flower',now(),snapshot.profileId);
    await this.database.runAsync('DELETE FROM recipe_design_selections WHERE profile_id=? AND recipe_id IS NULL;',snapshot.profileId);
  }

  async selectRecipeDesign(designId: string, recipeId?: string): Promise<void> {
    const snapshot = await this.getSnapshot();
    const design = snapshot.designs.find((item) => item.id === designId);
    if (!design?.isOwned) throw new Error('Ese diseño aún no está desbloqueado.');
    const timestamp = now();
    const existing = await this.database.getFirstAsync<{ id: string }>(recipeId ? 'SELECT id FROM recipe_design_selections WHERE profile_id=? AND recipe_id=?;' : 'SELECT id FROM recipe_design_selections WHERE profile_id=? AND recipe_id IS NULL;',...(recipeId ? [snapshot.profileId,recipeId] : [snapshot.profileId]));
    if (existing) await this.database.runAsync('UPDATE recipe_design_selections SET design_id=?,updated_at=? WHERE id=?;',designId,timestamp,existing.id);
    else await this.database.runAsync('INSERT INTO recipe_design_selections(id,profile_id,recipe_id,design_id,updated_at) VALUES(?,?,?,?,?);',this.createUuid(),snapshot.profileId,recipeId ?? null,designId,timestamp);
  }

  async getRecipeDesign(recipeId: string): Promise<string> {
    const snapshot = await this.getSnapshot();
    const selected = await this.database.getFirstAsync<{ designId: string }>('SELECT design_id AS designId FROM recipe_design_selections WHERE profile_id=? AND recipe_id=?;',snapshot.profileId,recipeId);
    if (selected && snapshot.designs.some((item) => item.id === selected.designId && item.isOwned)) return selected.designId;
    return snapshot.defaultDesignId;
  }
}
