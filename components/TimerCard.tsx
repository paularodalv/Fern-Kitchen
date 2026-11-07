import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors, radii } from '@/constants/theme';
import { useRecipeTimer } from '@/hooks/useRecipeTimer';

export function TimerCard({ recipeId, stepId, title, minutes }: { recipeId: string; stepId: string; title: string; minutes: number }) {
  const { timer, remainingMs, loading, notificationMessage, start, pause, resume, reset } = useRecipeTimer(recipeId, stepId, title, minutes);
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const remaining = `${String(Math.floor(totalSeconds / 3600)).padStart(2, '0')}:${String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.clockIcon}><SymbolView name={{ android: 'hourglass_top', ios: 'hourglass', web: 'hourglass_top' }} tintColor={colors.greenDark} size={20} /></View>
        <View style={styles.copy}><Text style={styles.kicker}>TEMPORIZADOR</Text><Text numberOfLines={1} style={styles.title}>{title}</Text></View>
      </View>
      <View style={styles.bottomRow}>
        <Text accessibilityLabel={`Tiempo restante ${remaining}`} style={styles.time}>{remaining}</Text>
        <View style={styles.controls}>
          {timer.status === 'running' ? (
            <TimerButton label="Pausar" icon="pause" onPress={() => { void pause(); }} disabled={loading} />
          ) : timer.status === 'paused' ? (
            <TimerButton label="Reanudar" icon="play_arrow" onPress={() => { void resume(); }} disabled={loading} />
          ) : timer.status === 'completed' ? (
            <View style={styles.done}><Image source={require('../assets/images/fern-mouse.png')} style={styles.mouse} resizeMode="contain" /><Text style={styles.doneText}>Listo</Text></View>
          ) : (
            <TimerButton label="Iniciar" icon="play_arrow" onPress={() => { void start(); }} disabled={loading} />
          )}
          {timer.status !== 'idle' ? <Pressable accessibilityRole="button" onPress={() => { void reset(); }} style={styles.resetButton}><Text style={styles.resetText}>Reiniciar</Text></Pressable> : null}
        </View>
      </View>
      {notificationMessage ? <Text accessibilityRole="alert" style={styles.message}>{notificationMessage}</Text> : null}
    </View>
  );
}

function TimerButton({ label, icon, onPress, disabled }: { label: string; icon: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}>
      <SymbolView name={{ android: icon as never, ios: (icon === 'pause' ? 'pause.fill' : 'play.fill') as never, web: icon as never }} tintColor={colors.white} size={16} />
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 17, borderRadius: radii.md, backgroundColor: colors.greenLight, gap: 13 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clockIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 3 }, kicker: { color: colors.greenDark, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: colors.text, fontSize: 14, fontWeight: '700' }, bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  time: { color: colors.greenDark, fontSize: 25, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: 1 }, controls: { alignItems: 'flex-end', gap: 7 },
  button: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: colors.greenDark },
  buttonText: { color: colors.white, fontSize: 12, fontWeight: '700' }, disabled: { opacity: 0.55 }, resetButton: { paddingHorizontal: 8, paddingVertical: 3 }, resetText: { color: colors.greenDark, fontSize: 11, fontWeight: '600' },
  done: { flexDirection: 'row', alignItems: 'center', gap: 7 }, mouse: { width: 32, height: 32 }, doneText: { color: colors.greenDark, fontSize: 13, fontWeight: '700' },
  message: { color: '#785E34', fontSize: 10, lineHeight: 15 },
});
