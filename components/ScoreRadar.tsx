"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { MarketingReport } from "@/lib/reportSchema";

type Props = {
  diagnosis: MarketingReport["diagnosis"];
};

export default function ScoreRadar({ diagnosis }: Props) {
  const data = [
    { subject: "첫 화면", score: diagnosis.firstView },
    { subject: "CTA", score: diagnosis.cta },
    { subject: "카피", score: diagnosis.copywriting },
    { subject: "신뢰", score: diagnosis.trust },
    { subject: "전환", score: diagnosis.conversionFlow },
    { subject: "광고", score: diagnosis.adLanding },
    { subject: "모바일", score: diagnosis.mobileUx },
    { subject: "SEO", score: diagnosis.seo },
  ];

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 12, fill: "#111111", fontWeight: 700 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            stroke="#e5e7eb"
          />
          <Radar
            name="점수"
            dataKey="score"
            stroke="#e31b23"
            fill="#e31b23"
            fillOpacity={0.22}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
