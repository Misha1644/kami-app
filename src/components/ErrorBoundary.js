// Если в каком-то экране случится ошибка, вместо белого экрана покажем Ками
// и кнопку «Попробовать снова». Ошибка пишется в консоль.
import { Component } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Kami from './Kami';
import { colors } from '../theme';
import { tr } from '../i18n';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('Kami crashed:', error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={styles.wrap}>
        <Kami size={120} mood="worried" />
        <Text style={styles.h1}>{tr('¡Uy! Что-то сломалось')}</Text>
        <Text style={styles.body}>{tr('Твой прогресс сохранён. Попробуй открыть экран ещё раз.')}</Text>
        <Pressable accessibilityRole="button" onPress={() => this.setState({ failed: false })} style={styles.button}>
          <Text style={styles.buttonText}>{tr('Попробовать снова')}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: colors.bg },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  body: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  button: { minHeight: 48, paddingHorizontal: 20, borderRadius: 12, backgroundColor: colors.green, justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
