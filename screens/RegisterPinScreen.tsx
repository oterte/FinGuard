import React, { useState } from 'react';
import { Alert } from 'react-native';
import styled from 'styled-components/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { signUp } from '../src/cognito';
import { API_URL, AWS_LAMBDA_URL } from '@env';
type Props = NativeStackScreenProps<RootStackParamList, 'RegisterPin'>;

export default function RegisterPinScreen({ route, navigation }: Props) {
  const [pin, setPin] = useState('');

  const {
    id, password, name, email,
    birthdate, address, latitude, longitude,
  } = route.params;

  /* ───── keypad ───── */
  const handleKeyPress = (k: string) =>
    k === '←'
      ? setPin((p) => p.slice(0, -1))
      : pin.length < 4 && setPin((p) => p + k);

  /* ───── submit ───── */
  const handleSubmit = async () => {
  if (pin.length !== 4) return Alert.alert('4자리 숫자를 입력해주세요.');

  try {
    /* 1) Cognito signup */
    const { userSub } = await signUp({
      id,
      password,
      name,
      email,
      birthdate,
      address,
      latitude: String(latitude),
      longitude: String(longitude),
      secondaryPin: pin,
    });
    // 2) Lambda Function URL로 사용자 인증 요청
    await fetch(`${AWS_LAMBDA_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: id, 
        userPoolId: 'ap-northeast-2_SANDR0Zpb', 
      }),
    });

     /* 2) 좌표를 배열로 묶어 외부 API 전송 */
     await fetch(`${API_URL}/users`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         userSub: userSub,
         gps_location: [Number(latitude), Number(longitude)],
       }),
     });

    Alert.alert('회원가입 완료', '이제 로그인해 주세요.');
    navigation.navigate('Login');
  } catch (err: any) {
    console.error('회원가입 실패:', err);
    console.log(err)
    Alert.alert('회원가입 실패', err?.message ?? '문제가 발생했습니다.');
  }
};

  
  return (
    <Container>
      <Title>2차 비밀번호 등록</Title>
      <SubTitle>숫자 4자리를 입력해주세요</SubTitle>
      <PinBox>{'*'.repeat(pin.length)}</PinBox>

      <Keypad>
        {['1','2','3','4','5','6','7','8','9','0','←','완료'].map((k) => (
          <Key key={k} onPress={() => (k === '완료' ? handleSubmit() : handleKeyPress(k))}>
            <KeyText>{k}</KeyText>
          </Key>
        ))}
      </Keypad>
    </Container>
  );
}

/* styled-components  */
const Container = styled.View`flex:1;background:#121212;justify-content:center;align-items:center;padding:24px;`;
const Title = styled.Text`color:#fff;font-size:24px;font-weight:bold;margin-bottom:8px;`;
const SubTitle = styled.Text`color:#aaa;font-size:16px;margin-bottom:20px;`;
const PinBox = styled.Text`color:#fff;font-size:36px;letter-spacing:10px;margin-bottom:40px;`;
const Keypad = styled.View`flex-direction:row;flex-wrap:wrap;justify-content:space-between;width:80%;`;
const Key = styled.TouchableOpacity`width:30%;aspect-ratio:1;justify-content:center;align-items:center;background:#1e1e1e;border-radius:12px;margin:8px;`;
const KeyText = styled.Text`color:#fff;font-size:24px;`;
