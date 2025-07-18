import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import styled from 'styled-components/native';
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList } from '../types';
import { getCurrentLocation } from '../src/useCurrentLocation';

import { API_URL } from '@env';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EnterAmount'>;
type Rt  = RouteProp<RootStackParamList, 'EnterAmount'>;

export default function EnterAmountScreen() {
  const navigation = useNavigation<Nav>();
  const {
    params: { myAccount },
  } = useRoute<Rt>();

  const [counter, setCounter] = useState('');
  const [amount , setAmount ] = useState('');

  const onKey = (k: string) => {
    if (k === '←') {
      setAmount(prev => prev.slice(0, -1));
      return;
    }
    const next    = amount + k;
    const numeric = Number(next.replace(/,/g, ''));

    if (numeric > myAccount.balance) {
      Alert.alert('잔액이 부족합니다.');
      return;
    }
    setAmount(next);
  };

  const handleSend = async () => {
    const money = Number(amount.replace(/,/g, ''));
    if (!counter.trim())  { Alert.alert('상대 계좌번호를 입력하세요.'); return; }
    if (!money || money <= 0) { Alert.alert('금액을 입력하세요.');   return; }

    const location = await getCurrentLocation();
    if (!location) {
      Alert.alert('위치 실패', '현재 위치를 가져오지 못했습니다.');
      return;
    }

    try {
      const userSub = await AsyncStorage.getItem('@userSub');
      if (!userSub) throw new Error('userSub 불러오기 실패');

      const payload = {
        userSub,
        my_account: myAccount.accountNumber,
        counter_account: counter,
        money,
        used_card: 1,
        description: '출금',
        location: [location.latitude, location.longitude],
      };

      const res = await fetch(
        `${API_URL}/banks/accounts`,
        {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify(payload),
        },
      );

      if (res.status === 403) {
        const { message } = await res.json();
        Alert.alert('송금 차단', message);
        return;
      }
      if (!res.ok) throw new Error(`전송 실패: ${res.status}`);

      // SQS 등록은 더 이상 하지 않음
      // await sendTransactionToSqs(payload);

      Alert.alert('송금 완료', `${money.toLocaleString()}원 송금되었습니다.`);
      navigation.navigate('Home');
    } catch (e: any) {
      console.error(e);
      Alert.alert('오류', e?.message ?? '송금 중 문제가 발생했습니다.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <Container>
          <Header>
            <BackBtn onPress={() => navigation.goBack()}>
              <BackTxt>←</BackTxt>
            </BackBtn>
          </Header>

          <Title>{myAccount.accountName} 계좌에서</Title>
          <BalanceTxt>
            잔액 {myAccount.balance.toLocaleString()}원
          </BalanceTxt>

          <SubTitle>받는 사람 계좌번호</SubTitle>
          <AccountInput
            placeholder="예) 123-456-78910"
            placeholderTextColor="#888"
            value={counter}
            onChangeText={setCounter}
            keyboardType="numbers-and-punctuation"
          />

          <Prompt>{amount ? '보낼 금액' : '얼마나 보낼까요?'}</Prompt>
          <AmtBox>₩ {Number(amount || '0').toLocaleString()}</AmtBox>

          <Pad>
            {['1','2','3','4','5','6','7','8','9','00','0','←'].map(k => (
              <PadBtn key={k} onPress={() => onKey(k)}>
                <PadTxt>{k}</PadTxt>
              </PadBtn>
            ))}
          </Pad>

          <SendBtn onPress={handleSend}>
            <SendTxt>송금</SendTxt>
          </SendBtn>
        </Container>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const Container   = styled.View` flex:1; background:#121212; padding:24px;`;
const Header      = styled.View` flex-direction:row; align-items:center; margin-bottom:24px;`;
const BackBtn     = styled.TouchableOpacity` padding:12px;`;
const BackTxt     = styled.Text` color:#fff; font-size:36px;`;

const Title       = styled.Text` color:#fff; font-size:22px; font-weight:bold;`;
const BalanceTxt  = styled.Text` color:#aaa; font-size:14px; margin-bottom:18px;`;

const SubTitle    = styled.Text` color:#fff; font-size:20px; margin-bottom:4px; font-weight:bold;`;
const AccountInput= styled.TextInput`
  background:#1e1e1e; color:#fff; padding:12px; border-radius:10px; margin-bottom:24px;
`;

const Prompt      = styled.Text` color:#999; font-size:18px; margin-bottom:6px;`;
const AmtBox      = styled.Text` color:#fff; font-size:26px; font-weight:bold; margin-bottom:32px;`;

const Pad         = styled.View` flex-direction:row; flex-wrap:wrap; justify-content:space-between;`;
const PadBtn      = styled.TouchableOpacity`
  width:30%; aspect-ratio:1; justify-content:center; align-items:center;
  margin-bottom:16px; background:#1e1e1e; border-radius:12px;
`;
const PadTxt      = styled.Text` color:#fff; font-size:26px;`;

const SendBtn     = styled.TouchableOpacity`
  margin-top:24px; background:#007aff; padding:18px; border-radius:12px; align-items:center;
`;
const SendTxt     = styled.Text` color:#fff; font-size:18px; font-weight:bold;`;
