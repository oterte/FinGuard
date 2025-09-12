import { Alert, Linking, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import DeviceInfo from 'react-native-device-info';

export type Location =
  | { latitude: number; longitude: number }
  | null;

export async function getCurrentLocation(): Promise<Location> {
  /* 1) 위치 권한 요청 */
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  );

  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
    Alert.alert(
      '위치 권한이 필요합니다',
      '정상적인 기능 이용을 위해 위치 권한이 필요합니다. 설정에서 권한을 허용해주세요.',
      [
        { text: '설정으로 이동', onPress: () => Linking.openSettings() },
        { text: '취소', style: 'cancel' },
      ]
    );
    return null;
  }

  /* 2) 현재 위치 수신 */
  return new Promise<Location>(async (resolve) => {
    // const isEmulator = await DeviceInfo.isEmulator();

    // if (isEmulator) {
    //   Alert.alert(
    //     '보안 경고',
    //     '에뮬레이터에서는 위치 기반 기능을 사용할 수 없습니다.'
    //   );
    //   return resolve(null);
    // }

    Geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const mocked = (pos as any).mocked;

        if (mocked === true) {
          console.warn('이상 위치 감지됨');
          Alert.alert(
            '위치 오류',
            '기기의 위치가 조작되었을 수 있습니다. 실제 위치 사용을 권장합니다.'
          );
          resolve(null);
        } else {
          resolve({ latitude, longitude });
        }
      },
      (err) => {
        console.warn('위치 오류:', err);
        Alert.alert('위치 오류', '현재 위치를 가져올 수 없습니다.');
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  });
}