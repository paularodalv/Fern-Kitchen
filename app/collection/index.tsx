import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { CollectionPage, CollectionCard, collectionStyles as shared } from '@/components/CollectionPage';
import { useCollectionRepository } from '@/hooks/useCollectionRepository';
import type { CollectionSnapshot } from '@/database/repositories/CollectionRepository';
import { colors, radii } from '@/constants/theme';
import { LEVELS } from '@/features/collection/catalog';

export default function CollectionHomeScreen() {
  const repository = useCollectionRepository();
  const [data, setData] = useState<CollectionSnapshot | null>(null);
  useFocusEffect(useCallback(() => { let active = true; repository.getSnapshot().then((value) => { if (active) setData(value); }).catch(() => undefined); return () => { active = false; }; }, [repository]));
  const levelName = data ? ['Aprendiz de cocina','Manos de harina','Cocinero curioso','Artesano de sabores','Maestro de fermentos','Alma de Fern Kitchen'][Math.min(data.level - 1, 5)] : 'Tu camino en la cocina';
  const next = data?.nextThreshold;
  const currentThreshold = LEVELS[(data?.level ?? 1) - 1]?.threshold ?? 0;
  const progress = data ? next ? Math.min(1,(data.xp - currentThreshold) / (next - currentThreshold)) : 1 : 0;
  return <CollectionPage title="Mi colección" subtitle="Un rincón privado para guardar los pasos, las ideas y los detalles que hacen tuya esta cocina.">
    <View style={styles.hero}><Image source={require('../../assets/images/fern-mouse.png')} style={styles.mouse} resizeMode="contain" /><View style={{ flex: 1 }}><Text style={styles.level}>{levelName}</Text><Text style={styles.xp}>{data?.xp ?? 0} puntos de experiencia</Text><View style={styles.track}><View style={[styles.bar,{width:`${progress * 100}%`}]} /></View><Text style={styles.next}>{next ? `${next - (data?.xp ?? 0)} puntos para el siguiente nivel` : 'Has alcanzado el último nivel'}</Text></View></View>
    <Text style={shared.section}>TU CUADERNO PERSONAL</Text>
    <CollectionCard icon="auto_awesome" title="Mi progreso" detail="Niveles, hitos y recuerdos desbloqueados" onPress={() => router.push('/collection/progress' as never)} trailing={<Text style={shared.tag}>{data?.achievements.filter((item) => item.isCompleted).length ?? 0} hitos</Text>} />
    <CollectionCard icon="collections_bookmark" title="Mi álbum" detail="Pegatinas organizadas por colección" onPress={() => router.push('/collection/album' as never)} trailing={<Text style={shared.tag}>{data?.stickers.filter((item) => item.unlockedAt).length ?? 0}/{data?.stickers.length ?? 0}</Text>} />
    <CollectionCard icon="face" title="Mi estilo" detail="Previsualiza tus detalles y distintivos" onPress={() => router.push('/collection/style' as never)} />
    <CollectionCard icon="celebration" title="Mis eventos" detail="Propuestas locales de temporada y su archivo" onPress={() => router.push('/collection/events' as never)} />
    <CollectionCard icon="palette" title="Diseño de recetas" detail="Elige el papel decorativo de tus fichas" onPress={() => router.push('/collection/designs' as never)} />
    <View style={styles.privacy}><SymbolView name={{android:'lock' as never,ios:'lock.fill',web:'lock' as never}} tintColor={colors.greenDark} size={16}/><Text style={styles.privacyText}>Tu colección se guarda solo en este dispositivo.</Text></View>
  </CollectionPage>;
}

const styles=StyleSheet.create({hero:{flexDirection:'row',alignItems:'center',gap:12,padding:18,borderRadius:radii.lg,backgroundColor:colors.greenLight,marginTop:10},mouse:{width:66,height:66},level:{fontFamily:'serif',fontSize:18,fontWeight:'700',color:colors.greenDark},xp:{color:colors.text,fontSize:12,marginTop:4},track:{height:7,borderRadius:5,backgroundColor:'#FFFFFFAA',marginTop:12,overflow:'hidden'},bar:{height:7,borderRadius:5,backgroundColor:colors.green},next:{fontSize:10,color:colors.secondaryText,marginTop:5},privacy:{flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',marginTop:18},privacyText:{color:colors.secondaryText,fontSize:10}});
