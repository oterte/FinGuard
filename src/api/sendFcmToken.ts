import axios from 'axios';
import { AWS_API_URL } from '@env'; 
/**
 * 로그인 후 발급된 FCM 토큰을 Lambda 함수로 전송
 * @param token FCM token
 * @param userId 사용자 아이디
 */
export const sendFcmTokenToLambda = async (token: string, userId: string) => {
  try {
    const payload = JSON.stringify({ token, userId });

    const response = await axios.post(
      `${AWS_API_URL}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 200) {
      console.log('✅ FCM 토큰 Lambda 전송 성공');
    } else {
      console.warn('⚠️ FCM 토큰 전송 실패:', response.data);
    }
  } catch (error: any) {
    console.error('❌ Lambda 호출 중 오류:', error.response?.data || error.message);
    throw error;
  }
};
