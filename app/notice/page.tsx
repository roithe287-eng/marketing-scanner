import type {Metadata} from 'next';
import BrandHeader from '@/components/BrandHeader';
import Disclaimer from '@/components/Disclaimer';

export const metadata:Metadata={title:'진단 결과 이용 안내 | 마케팅스캐너'};
export default function NoticePage() {
  return <main><BrandHeader/><div className="jm-container py-10 md:py-16"><a href="/" className="inline-block mb-6 text-sm font-bold">← 마케팅스캐너로 돌아가기</a><Disclaimer/></div></main>;
}
