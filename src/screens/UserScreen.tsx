import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert } from 'react-native'
import { useSettings } from '../contexts/SettingsContext'
import { useI18n } from '../contexts/I18nContext'
import { useAuth } from '../contexts/AuthContext'
import { seedDummyTransactions } from '../services/SeedService'

export default function UserScreen() {
  const { theme, language, displayName, avatarUri, setTheme, setLanguage, setDisplayName, setAvatarUri } = useSettings()
  const { t } = useI18n()
  const { user } = useAuth()
  const [name, setName] = useState(displayName || '')
  const [avatar, setAvatar] = useState(avatarUri || '')

  useEffect(() => {
    setName(displayName || '')
  }, [displayName])
  useEffect(() => {
    setAvatar(avatarUri || '')
  }, [avatarUri])

  const isDark = theme === 'dark'

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#101214' : '#F8F9FA' }]}> 
      <Text style={[styles.title, { color: isDark ? '#fff' : '#333' }]}>{t('user.title')}</Text>

      <View style={styles.card}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: '#E0E0E0' }]} />
        )}
        <TextInput
          style={[styles.input, { color: '#333' }]}
          value={avatar}
          onChangeText={setAvatar}
          placeholder="Avatar URL"
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.button} onPress={() => setAvatarUri(avatar.trim())}>
          <Text style={styles.buttonText}>OK</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t('user.name')}</Text>
        <TextInput
          style={[styles.input, { color: '#333' }]}
          value={name}
          onChangeText={setName}
          placeholder={t('user.name')}
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.button} onPress={() => setDisplayName(name.trim())}>
          <Text style={styles.buttonText}>OK</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t('user.theme')}</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.option, theme === 'light' && styles.optionActive]}
            onPress={() => setTheme('light')}
          >
            <Text style={[styles.optionText, theme === 'light' && styles.optionTextActive]}>{t('user.theme.light')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.option, theme === 'dark' && styles.optionActive]}
            onPress={() => setTheme('dark')}
          >
            <Text style={[styles.optionText, theme === 'dark' && styles.optionTextActive]}>{t('user.theme.dark')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t('user.language')}</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.option, language === 'en' && styles.optionActive]}
            onPress={() => setLanguage('en')}
          >
            <Text style={[styles.optionText, language === 'en' && styles.optionTextActive]}>{t('user.language.en')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.option, language === 'pt-BR' && styles.optionActive]}
            onPress={() => setLanguage('pt-BR')}
          >
            <Text style={[styles.optionText, language === 'pt-BR' && styles.optionTextActive]}>{t('user.language.pt')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t('user.demo.title')}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={async () => {
            try {
              const targetId = 'be0f796f-750f-48d9-a168-59cb48c44b8a'
              const uid = user?.id || ''
              if (uid !== targetId) {
                // Still allow seeding for the logged-in user to validate UI
                const { count } = await seedDummyTransactions(uid)
                Alert.alert('OK', t('user.demo.success'))
              } else {
                const { count } = await seedDummyTransactions(targetId)
                Alert.alert('OK', t('user.demo.success'))
              }
            } catch (e) {
              Alert.alert('Error', t('user.demo.error'))
            }
          }}
        >
          <Text style={styles.buttonText}>{t('user.demo.button')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: '#fff'
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#4A90E2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    backgroundColor: '#fff'
  },
  optionActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#EAF2FD',
  },
  optionText: {
    color: '#666',
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#4A90E2',
  }
})
