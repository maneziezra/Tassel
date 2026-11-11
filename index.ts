// App entry. Background tasks must be defined before the router starts (lib/backgroundTasks.ts),
// so that Android can run them without opening a screen.
import './lib/backgroundTasks';
import 'expo-router/entry';
