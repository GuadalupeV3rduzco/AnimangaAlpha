// Carga la función estándar para obtener la configuración base de Expo
const { getDefaultConfig } = require('@expo/metro-config');

// Obtenemos la configuración base
const config = getDefaultConfig(__dirname);

// >>> APLICACIÓN DE LA CORRECCIÓN DE ASYNCSTORAGE (Resolviendo el error de "hooks") <<<
// Forzamos a Metro a usar el archivo principal de AsyncStorage para evitar el error interno de resolución.
config.resolver.extraNodeModules = {
    '@react-native-async-storage/async-storage': require.resolve(
        '@react-native-async-storage/async-storage/lib/commonjs/AsyncStorage.js'
    ),
};

module.exports = config;