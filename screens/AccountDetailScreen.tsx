import React, { useEffect, useState } from 'react';
import { Alert, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { API_URL } from '@env';
import { sanitizeDisplayText } from '../src/security/sanitize'; 

type Nav = NativeStackNavigationProp<RootStackParamList, 'AccountDetail'>;
type Rt  = RouteProp<RootStackParamList, 'AccountDetail'>;

type Transaction = {
  transactionId: string;
  title: string;
  time: string;
  amount: number;
  isAnomaly?: boolean;
};

type AccountRes = {
  accountId: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  balance: number;
  transactions: Transaction[];
};

export default function AccountDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params: { accountId } } = useRoute<Rt>();

  const [data, setData] = useState<AccountRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'normal' | 'anomaly'>('normal');

  // route 파라미터 화이트리스트 정제 (영숫자/대시/언더스코어만)
  const safeAccountId = String(accountId).replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 64);
  console.log(accountId)
  console.log(safeAccountId)
  useEffect(() => {
    if (!safeAccountId) {
      Alert.alert('잘못된 접근', '계좌 식별자가 올바르지 않습니다.');
      setLoading(false);
      return;
    }

    const ENDPOINT = `${API_URL}/accounts`;
    (async () => {
      try {
        const res = await fetch(`${ENDPOINT}/${safeAccountId}`);

        // 응답이 실패했을 때, JSON 본문을 읽어와서 상세 오류 메시지를 확인.
        if (!res.ok) {
          const errorData = await res.json();
          console.error('API 응답 에러 데이터:', errorData); // <-- 서버가 보낸 상세 메시지를 콘솔에 출력
          throw new Error(`서버 오류: ${res.status} - ${errorData?.detail || '상세 메시지 없음'}`);
        }

        setData(await res.json());
      } catch (e: any) {
        console.error("Error", e);
        Alert.alert('계좌 조회 실패', e?.message ?? '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    })();
  }, [safeAccountId]); // 의존성 배열도 safeAccountId로 변경

  const handleSend = () => {
    if (!data) { Alert.alert('계좌 정보를 불러오지 못했습니다.'); return; }
    navigation.navigate('EnterAmount', {
      fromAccountId: data.accountId,
      myAccount: {
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        bankName: data.bankName,
        balance: data.balance,
      },
    });
  };

  if (loading) {
    return (
      <Center>
        <ActivityIndicator color="#00c471" />
      </Center>
    );
  }

  if (!data) {
    return (
      <Center>
        <Label>계좌 정보를 불러오지 못했습니다.</Label>
      </Center>
    );
  }

  const normal = data.transactions.filter(t => !t.isAnomaly);
  const anomaly = data.transactions.filter(t => t.isAnomaly);

  return (
    <Container>
      <Header>
        <BackBtn onPress={() => navigation.goBack()}>
          <BackTxt>←</BackTxt>
        </BackBtn>
      </Header>

      <InfoBox>
        <BankTxt>{`${sanitizeDisplayText(data.bankName, 40)}  ${sanitizeDisplayText(data.accountName, 40)}`}</BankTxt>
        <NumTxt>{sanitizeDisplayText(data.accountNumber, 40)}</NumTxt>
        <BalTxt>{data.balance.toLocaleString()}원</BalTxt>
      </InfoBox>

      <TabRow>
        <TabButton active={tab === 'normal'} onPress={() => setTab('normal')}>
          <TabText active={tab === 'normal'}>📋 정상 거래</TabText>
        </TabButton>
        <TabButton active={tab === 'anomaly'} onPress={() => setTab('anomaly')}>
          <TabText active={tab === 'anomaly'}>🚨 이상 거래</TabText>
        </TabButton>
      </TabRow>

      <ScrollView>
        {(tab === 'normal' ? normal : anomaly).map(t => (
          <Txn key={t.transactionId}>
            <Label>{sanitizeDisplayText(t.title, 80)}</Label>
            <Row>
              <Label>{sanitizeDisplayText(t.time, 80)}</Label>
              <Amt pos={t.amount >= 0}>
                {t.amount >= 0 ? '+' : ''}
                {t.amount.toLocaleString()}원
              </Amt>
            </Row>
          </Txn>
        ))}

        {tab === 'anomaly' && anomaly.length === 0 && (
          <Label style={{ color: '#666', marginBottom: 16 }}>이상 거래 없음</Label>
        )}
      </ScrollView>

      <Row style={{ marginTop: 40 }}>
        <ActBtn><ActTxt>채우기</ActTxt></ActBtn>
        <ActBtn onPress={handleSend}><ActTxt>보내기</ActTxt></ActBtn>
      </Row>
    </Container>
  );
}


const Container = styled.View`flex: 1; background: #121212; padding: 24px;`;
const ScrollView = styled.ScrollView`margin-top: 12px;`;
const Center = styled.View`flex: 1; justify-content: center; align-items: center; background: #121212;`;
const Header = styled.View`flex-direction: row; margin-bottom: 16px;`;
const BackBtn = styled.TouchableOpacity`padding: 12px;`;
const BackTxt = styled.Text`color: #fff; font-size: 36px;`;
const InfoBox = styled.View`margin-bottom: 24px;`;
const BankTxt = styled.Text`color: #aaa; font-size: 14px;`;
const NumTxt  = styled.Text`color: #666; font-size: 14px; margin-top: 2px;`;
const BalTxt  = styled.Text`color: #fff; font-size: 32px; font-weight: bold; margin-top: 4px;`;
const TabRow = styled.View`flex-direction: row; justify-content: space-around; margin-bottom: 8px;`;
const TabButton = styled.TouchableOpacity<{ active: boolean }>`
  padding: 10px 16px;
  border-bottom-width: 2px;
  border-bottom-color: ${({ active }) => (active ? '#00c471' : 'transparent')};
`;
const TabText = styled.Text<{ active: boolean }>`
  color: ${({ active }) => (active ? '#00c471' : '#aaa')};
  font-weight: bold;
  font-size: 16px;
`;
const Txn = styled.View`padding: 16px 0; border-bottom-width: 1px; border-bottom-color: #333;`;
const Row = styled.View`flex-direction: row; justify-content: space-between;`;
const Label = styled.Text`color: #ddd; font-size: 15px;`;
const Amt = styled.Text<{ pos: boolean }>`color: ${({ pos }) => (pos ? '#4da6ff' : '#f44336')}; font-size: 15px;`;
const ActBtn = styled.TouchableOpacity`
  flex: 1; background: #1f4fff; margin: 0 4px; padding: 14px 0; border-radius: 12px; align-items: center;
`;
const ActTxt = styled.Text`color: #fff; font-weight: bold; font-size: 16px;`;