import React, { useState } from 'react';
import { Alert } from 'react-native';
import styled from 'styled-components/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { API_URL } from '@env';
import { RootStackParamList } from '../types';
import { sanitizeName } from '../src/security/sanitize'; 

type Props = NativeStackScreenProps<RootStackParamList, 'CreateAccount'>;

export default function CreateAccountScreen({ navigation }: Props) {
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');

  const handleCreate = async () => {
    const safeBank = sanitizeName(bankName, 30);
    const safeAcc  = sanitizeName(accountName, 30);

    if (!safeBank.trim() || !safeAcc.trim()) {
      Alert.alert('입력 오류', '은행명과 통장 이름은 한글/영문과 공백만 가능합니다.');
      return;
    }

    const userSub = await AsyncStorage.getItem('@userSub');
    if (!userSub) {
      Alert.alert('세션 오류', '사용자 정보를 찾을 수 없습니다. 다시 로그인해 주세요.');
      return;
    }

    const payload = { userSub, accountName: safeAcc.trim(), bankName: safeBank.trim() };

    try {
      const res = await fetch(`${API_URL}/accounts/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // 서버 에러 문구 일반화
      if (!res.ok) {
        let errMsg = '요청을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.';
        try {
          const json = await res.json();
          if (json?.message && typeof json.message === 'string') errMsg = '통장 생성에 실패했습니다.';
        } catch {}
        throw new Error(errMsg);
      }

      Alert.alert('통장이 생성되었습니다!', '', [
        { text: '확인', onPress: () => navigation.navigate('Home') },
      ]);
    } catch (e: any) {
      console.error(e);
      Alert.alert('통장 생성 실패', e?.message ?? '알 수 없는 오류가 발생했습니다.');
    }
  };

  return (
    <Container>
      <Title>새 통장 만들기</Title>

      <Label>은행명</Label>
      <Input
        placeholder="예: 국민은행"
        placeholderTextColor="#888"
        value={bankName}
        onChangeText={(t) => setBankName(sanitizeName(t, 30))} // 적용
        autoCapitalize="none"
      />

      <Label>통장 이름</Label>
      <Input
        placeholder="예: 생활비 통장"
        placeholderTextColor="#888"
        value={accountName}
        onChangeText={(t) => setAccountName(sanitizeName(t, 30))} // 적용
        autoCapitalize="none"
      />

      <CreateBtn onPress={handleCreate}>
        <CreateTxt>통장 생성</CreateTxt>
      </CreateBtn>
    </Container>
  );
}


const Container = styled.SafeAreaView`flex: 1; background: #121212; padding: 24px;`;
const Title = styled.Text`font-size: 24px; color: #fff; margin-bottom: 24px;`;
const Label = styled.Text`color: #ccc; font-size: 14px; margin-bottom: 4px;`;
const Input = styled.TextInput`
  background: #1e1e1e; color: #fff; padding: 12px; border-radius: 10px; margin-bottom: 20px;
`;
const CreateBtn = styled.TouchableOpacity`
  background: #007aff; padding: 14px; border-radius: 10px; align-items: center;
`;
const CreateTxt = styled.Text`color: #fff; font-size: 16px; font-weight: bold;`;