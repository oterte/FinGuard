import React, { useState, useCallback } from 'react';
import { Alert} from 'react-native';
import styled from 'styled-components/native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';

import { RootStackParamList } from '../types';
import { API_URL } from '@env';
import { getFcmToken, deleteFcmToken } from '../src/secureStorage';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type Account = {
  accountId: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  balance: number;
};

interface Props {
  setIsLoggedIn: (v: boolean) => void;
}

export default function HomeScreen({ setIsLoggedIn }: Props) {
  const navigation = useNavigation<Nav>();
  const [accs, setAccs] = useState<Account[]>([]);

  /* ───── FCM 메시지 수신 처리 ───── */
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = messaging().onMessage(async remoteMessage => {
        console.log('🔔 포그라운드 수신 메시지:', remoteMessage);
        Alert.alert(
          remoteMessage.notification?.title || '알림',
          remoteMessage.notification?.body || '메시지가 도착했습니다.'
        );
      });

      return () => unsubscribe();
    }, [])
  );

  /* ───── 로그아웃 ───── */
  const handleLogout = useCallback(() => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('@userSub');
          await deleteFcmToken(); // SecureStorage에서 FCM 토큰 제거
          setIsLoggedIn(false);
          Alert.alert('로그아웃 완료');
        },
      },
    ]);
  }, [setIsLoggedIn]);

  /* ───── 계좌 조회 ───── */
  useFocusEffect(
    useCallback(() => {
      const ENDPOINT = `${API_URL}/accounts/financial`;


      
      const fetchAccounts = async () => {
        try {
          const sub = await AsyncStorage.getItem('@userSub');
          const fcmToken = await getFcmToken();
          console.log("sub",sub)
          console.log("fcmToken",fcmToken)

          if (!sub) throw new Error('사용자 식별자 없음');
          if (!fcmToken) throw new Error('FCM 토큰 없음');

          const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sub, fcmToken: [fcmToken] }),
          });

          if (!res.ok) throw new Error(`서버 오류: ${res.status}`);

          const { accounts } = (await res.json()) as { accounts: Account[] };
          setAccs(accounts);
        } catch (e: any) {
          console.error(e);
          Alert.alert('계좌 조회 실패', e?.message ?? '알 수 없는 오류');
        }
      };

      fetchAccounts();
    }, [])
  );

  /* ───── UI ───── */
  return (
    <Container>
      <TitleRow>
        <Title>내 계좌</Title>
        <LogoutBtn onPress={handleLogout}>
          <LogoutTxt>로그아웃</LogoutTxt>
        </LogoutBtn>
      </TitleRow>

      {accs.map(acc => (
        <Card
          key={acc.accountId}
          onPress={() =>
            navigation.navigate('AccountDetail', { accountId: acc.accountId })
          }>
          <BankTxt>{`${acc.bankName} • ${acc.accountName}`}</BankTxt>
          <BalTxt>{acc.balance.toLocaleString()}원</BalTxt>
        </Card>
      ))}

      <NewBtn onPress={() => navigation.navigate('CreateAccount')}>
        <NewTxt>➕ 새 통장 만들기</NewTxt>
      </NewBtn>
    </Container>
  );
}

/* ───── 스타일 ───── */
const Container = styled.ScrollView`
  flex: 1;
  background: #121212;
  padding: 24px;
`;

const TitleRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.Text`
  color: #fff;
  font-size: 24px;
  font-weight: bold;
`;

const LogoutBtn = styled.TouchableOpacity`
  padding: 6px 12px;
  background: #ff5555;
  border-radius: 8px;
`;
const LogoutTxt = styled.Text`
  color: #fff;
  font-size: 14px;
  font-weight: 600;
`;

const Card = styled.TouchableOpacity`
  background: #1e1e1e;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 16px;
`;
const BankTxt = styled.Text`color: #aaa; font-size: 14px;`;
const BalTxt = styled.Text`color: #fff; font-size: 20px; font-weight: bold;`;

const NewBtn = styled.TouchableOpacity`
  background: #007aff;
  padding: 16px;
  border-radius: 12px;
  align-items: center;
  margin-top: 20px;
`;
const NewTxt = styled.Text`color: #fff; font-size: 16px; font-weight: bold;`;
