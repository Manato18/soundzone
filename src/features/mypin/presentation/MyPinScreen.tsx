import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { formatDuration } from '../../../shared/utils/timeUtils';
import {
    deleteLocalAudioPin,
    getLocalAudioPins,
    getStorageInfo,
    LocalAudioPin,
} from '../../recording/services/localStorageService';

interface AudioPinItemProps {
  item: LocalAudioPin;
  onPlay: (item: LocalAudioPin) => void;
  onDelete: (item: LocalAudioPin) => void;
  isPlaying: boolean;
}

const AudioPinItem: React.FC<AudioPinItemProps> = ({ item, onPlay, onDelete, isPlaying }) => {
  return (
    <View style={styles.pinItem}>
      <View style={styles.pinContent}>
        <View style={styles.pinHeader}>
          <Text style={styles.pinTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.pinDate}>
            {new Date(item.createdAt).toLocaleDateString('ja-JP', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        
        {item.description && (
          <Text style={styles.pinDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        
        <View style={styles.pinFooter}>
          <Text style={styles.duration}>
            {formatDuration(item.duration)}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => onPlay(item)}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={20}
                color="#4a9eff"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => onDelete(item)}
            >
              <Ionicons name="trash" size={20} color="#ff4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

export default function MyPinScreen() {
  const [pins, setPins] = useState<LocalAudioPin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{
    totalPins: number;
    totalSizeBytes: number;
  }>({ totalPins: 0, totalSizeBytes: 0 });

  // 音声プレイヤー
  const [currentPlayingPin, setCurrentPlayingPin] = useState<LocalAudioPin | null>(null);
  const player = useAudioPlayer(currentPlayingPin ? { uri: currentPlayingPin.audioUri } : null);
  const status = useAudioPlayerStatus(player);

  // データ読み込み
  const loadPins = useCallback(async () => {
    try {
      const [localPins, storage] = await Promise.all([
        getLocalAudioPins(),
        getStorageInfo(),
      ]);
      
      setPins(localPins);
      setStorageInfo(storage);
    } catch (error) {
      console.error('ピン読み込みエラー:', error);
      Alert.alert('エラー', 'データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 初回読み込み
  useEffect(() => {
    loadPins();
  }, [loadPins]);

  // 音声再生状態の監視
  useEffect(() => {
    if (status.playing === false && currentPlayingPin) {
      // 再生が終了した場合の処理
    }
  }, [status.playing, currentPlayingPin]);

  // リフレッシュ
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPins();
  }, [loadPins]);

  // 音声再生/停止
  const handlePlay = useCallback(
    (item: LocalAudioPin) => {
      if (currentPlayingPin?.id === item.id && status.playing) {
        // 同じアイテムが再生中の場合は停止
        player.pause();
      } else {
        // 新しいアイテムを再生
        setCurrentPlayingPin(item);
        if (currentPlayingPin?.id !== item.id) {
          // 異なるアイテムの場合は最初から再生
          player.seekTo(0);
        }
        player.play();
      }
    },
    [currentPlayingPin, status.playing, player]
  );

  // 音声削除
  const handleDelete = useCallback(
    (item: LocalAudioPin) => {
      Alert.alert(
        '削除確認',
        `「${item.title}」を削除しますか？この操作は元に戻せません。`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '削除',
            style: 'destructive',
            onPress: async () => {
              try {
                // 再生中の場合は停止
                if (currentPlayingPin?.id === item.id) {
                  player.pause();
                  setCurrentPlayingPin(null);
                }
                
                await deleteLocalAudioPin(item.id);
                await loadPins(); // データを再読み込み
                
                Alert.alert('削除完了', '音声ピンが削除されました');
              } catch (error) {
                console.error('削除エラー:', error);
                Alert.alert('エラー', '削除に失敗しました');
              }
            },
          },
        ]
      );
    },
    [currentPlayingPin, player, loadPins]
  );

  // ストレージサイズをフォーマット
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const renderPinItem = ({ item }: { item: LocalAudioPin }) => (
    <AudioPinItem
      item={item}
      onPlay={handlePlay}
      onDelete={handleDelete}
      isPlaying={currentPlayingPin?.id === item.id && status.playing}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="mic-outline" size={64} color="#666" />
      <Text style={styles.emptyTitle}>録音がありません</Text>
      <Text style={styles.emptyDescription}>
        録音タブで音声を録音してみましょう
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.title}>マイ録音</Text>
        <View style={styles.storageInfo}>
          <Text style={styles.storageText}>
            {storageInfo.totalPins}件 • {formatFileSize(storageInfo.totalSizeBytes)}
          </Text>
        </View>
      </View>

      {/* リスト */}
      <FlatList
        data={pins}
        renderItem={renderPinItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={pins.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4a9eff"
            colors={['#4a9eff']}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  storageInfo: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  storageText: {
    fontSize: 12,
    color: '#aaa',
  },
  list: {
    padding: 20,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  pinItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  pinContent: {
    padding: 16,
  },
  pinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pinTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  pinDate: {
    fontSize: 12,
    color: '#666',
  },
  pinDescription: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 12,
    lineHeight: 20,
  },
  pinFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duration: {
    fontSize: 14,
    color: '#4a9eff',
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 