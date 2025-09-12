import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import styled from 'styled-components/native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../types';
import { getCurrentLocation } from '../src/useCurrentLocation';
import { API_URL } from '@env';
import { sanitizeDigitsDash } from '../src/security/sanitize';

// import { getFcmToken } from '../src/secureStorage';
// import { notifyTransaction } from '../src/api/notifyTransaction';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EnterAmount'>;
type Rt  = RouteProp<RootStackParamList, 'EnterAmount'>;

export default function EnterAmountScreen() {
  const navigation = useNavigation<Nav>();
  const { params: { myAccount } } = useRoute<Rt>();

  const [counter, setCounter] = useState('');
  const [amount, setAmount]   = useState(''); // 숫자만 보관
  const [sending, setSending] = useState(false); //  디바운스

  // 키패드 입력 (숫자만 허용)
  const onKey = (k: string) => {
    if (k === '←') {
      setAmount(prev => prev.slice(0, -1));
      return;
    }
    if (!/^\d+$/.test(k)) return; // 숫자만 허용
    const nextRaw = (amount + k).replace(/^0+(?=\d)/, ''); 
    const numeric = Number(nextRaw || '0');
    if (numeric > myAccount.balance) {
      Alert.alert('잔액이 부족합니다.');
      return;
    }
    if (nextRaw.length > 12) return; // 최대 12자리
    setAmount(nextRaw);
  };

  const handleSend = async () => {
    if (sending) return; // 중복 전송 방지
    const money = Number(amount || '0');
    const safeCounter = sanitizeDigitsDash(counter, 20);

    if (!safeCounter.trim()) { Alert.alert('상대 계좌번호를 입력하세요.'); return; }
    if (!/^\d{2,3}-?\d{2,6}-?\d{2,6}$/.test(safeCounter)) {
      Alert.alert('계좌번호 형식 오류', '계좌번호 포맷을 확인해주세요.');
      return;
    }
    if (!money || money <= 0) { Alert.alert('금액을 입력하세요.'); return; }

    const location = await getCurrentLocation();
    if (!location) {
      Alert.alert('위치 실패', '현재 위치를 가져오지 못했습니다.');
      return;
    }
   
    // const maybeMock =
    //   (location as any).mocked === true ||
    //   (location as any).isFromMockProvider === true;
    // if (maybeMock) {
    //   Alert.alert('위치 실패', '모의 위치가 감지되어 송금을 진행할 수 없습니다.');
    //   return;
    // }

    setSending(true);
    try {
      const userSub = await AsyncStorage.getItem('@userSub');
      if (!userSub) throw new Error('userSub 불러오기 실패');

      const payload = {
        userSub,
        my_account: myAccount.accountNumber,
        counter_account: safeCounter,
        money,
        used_card: 1,
        description: '출금',
        location: [location.latitude, location.longitude],
      };
      console.log("payload", payload.counter_account)
      console.log("payload", payload.my_account)
      console.log("payload", payload.userSub)
     
      const res = await fetch(`${API_URL}/transaction`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload),
      });

      if (res.status === 403) {
        const { message } = await res.json().catch(() => ({ message: '차단되었습니다.' }));
        throw new Error(typeof message === 'string' ? message : '정책에 의해 차단되었습니다.');
      }
      if (!res.ok) throw new Error(`전송 실패: ${res.status}`);

     
      // const result = await res.json().catch(() => ({} as any));
      // // const transactionId: string | undefined =
      // //   result?.id ?? result?.transactionId ?? result?.data?.id ?? result?.data?.transactionId;
      // // if (!transactionId) throw new Error('거래 ID를 확인하지 못했습니다.');

     
      // const fcmToken = await getFcmToken();
      // if (!fcmToken) throw new Error('FCM 토큰을 확인하지 못했습니다.');

      
      // await notifyTransaction({ transactionId, token: fcmToken, userId: userSub });

      
      Alert.alert('송금 완료', `${money.toLocaleString()}원 송금되었습니다.`);
      navigation.navigate('Home');
    } catch (e: any) {
      console.error(e);
      Alert.alert('송금 실패', e?.message ?? '송금 처리 중 문제가 발생했습니다.');
    } finally {
      // 1.5초 뒤 재시도 가능
      setTimeout(() => setSending(false), 1500);
    }
  };

  const formatted = Number(amount || '0').toLocaleString();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <Container>
          <Header>
            <BackBtn onPress={() => navigation.goBack()}>
              <BackTxt>←</BackTxt>
            </BackBtn>
          </Header>

          <Title>{myAccount.accountName} 계좌에서</Title>
          <BalanceTxt>잔액 {myAccount.balance.toLocaleString()}원</BalanceTxt>

          <SubTitle>받는 사람 계좌번호</SubTitle>
          <AccountInput
            placeholder="예) 123-456-78910"
            placeholderTextColor="#888"
            value={counter}
            onChangeText={(t) => setCounter(sanitizeDigitsDash(t, 20))}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
          />

          <Prompt>{amount ? '보낼 금액' : '얼마나 보낼까요?'}</Prompt>
          <AmtBox>₩ {formatted}</AmtBox>

          <Pad>
            {['1','2','3','4','5','6','7','8','9','0','←'].map(k => (
              <PadBtn key={k} onPress={() => onKey(k)}>
                <PadTxt>{k}</PadTxt>
              </PadBtn>
            ))}
          </Pad>

          <SendBtn onPress={handleSend} disabled={sending}>
            <SendTxt>{sending ? '전송 중...' : '송금'}</SendTxt>
          </SendBtn>
        </Container>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ───── 스타일 ───── */
const Container   = styled.View` flex:1; background:#121212; padding:24px;`;
const Header      = styled.View` flex-direction:row; align-items:center; margin-bottom:24px;`;
const BackBtn     = styled.TouchableOpacity` padding:12px;`;
const BackTxt     = styled.Text` color:#fff; font-size:36px;`;
const Title       = styled.Text` color:#fff; font-size:22px; font-weight:bold;`;
const BalanceTxt  = styled.Text` color:#aaa; font-size:14px; margin-bottom:18px;`;
const SubTitle    = styled.Text` color:#fff; font-size:20px; margin-bottom:4px; font-weight:bold;`;
const AccountInput= styled.TextInput` background:#1e1e1e; color:#fff; padding:12px; border-radius:10px; margin-bottom:24px;`;
const Prompt      = styled.Text` color:#999; font-size:18px; margin-bottom:6px;`;
const AmtBox      = styled.Text` color:#fff; font-size:26px; font-weight:bold; margin-bottom:32px;`;
const Pad         = styled.View` flex-direction:row; flex-wrap:wrap; justify-content:space-between;`;
const PadBtn      = styled.TouchableOpacity` width:30%; aspect-ratio:1; justify-content:center; align-items:center; margin-bottom:16px; background:#1e1e1e; border-radius:12px;`;
const PadTxt      = styled.Text` color:#fff; font-size:26px;`;
const SendBtn     = styled.TouchableOpacity` margin-top:24px; background:#007aff; padding:18px; border-radius:12px; align-items:center;`;
const SendTxt     = styled.Text` color:#fff; font-size:18px; font-weight:bold;`;