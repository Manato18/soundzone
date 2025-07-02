import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 35.6762,   // 東京駅の緯度
          longitude: 139.6503, // 東京駅の経度
          latitudeDelta: 0.01,  // ズームレベル（小さいほどズーム）
          longitudeDelta: 0.01,
        }}
        showsUserLocation={false}  // 位置情報はまだ使わない
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        mapType="standard"  // standard, satellite, hybrid, terrain
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
}); 