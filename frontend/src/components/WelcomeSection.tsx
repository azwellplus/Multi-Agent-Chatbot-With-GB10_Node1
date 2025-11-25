/*
# SPDX-FileCopyrightText: Copyright (c) 1993-2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
*/
import styles from "@/styles/WelcomeSection.module.css";

interface WelcomeSectionProps {
  setQuery: (value: string) => void;
}

export default function WelcomeSection({ setQuery }: WelcomeSectionProps) {
  const promptTemplates = {
    rag: "업로드한 문서를 참고해서 Blackwell GB202 GPU에 대해 알려줘.",
    code: "파이썬으로 주사위게임 개발하는 코드를 작성해줘.",
    chat: "분산 시스템 제품 관리자에게 커피챗을 요청하는 이메일 초안을 작성해줄래?",
    web: "에즈웰플러스에 관한 최근 뉴스 검색해줘!",
    imageAnalysis: "첨부한 이미지를 분석해서 주요 내용을 알려줘.",
    imageGeneration: "벚꽃이 흐드러지게 핀 봄날의 공원을 그려줘.",
  };

  const handleCardClick = (promptKey: keyof typeof promptTemplates) => {
    setQuery(promptTemplates[promptKey]);
  };

  return (
    <div className={styles.welcomeContainer}>
      <div className={styles.welcomeMessage}>
        안녕하세요! 메시지를 보내 대화를 시작해보세요.
      </div>
      <div className={styles.agentCards}>
        <div 
          className={`${styles.agentCard} ${styles.animate1}`}
          onClick={() => handleCardClick('rag')}
        >
          <div className={styles.agentIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <h3 className={styles.agentTitle}>문서 검색</h3>
          <p className={styles.agentSubtitle}>RAG 에이전트</p>
        </div>
        <div 
          className={`${styles.agentCard} ${styles.animate2}`}
          onClick={() => handleCardClick('code')}
        >
          <div className={styles.agentIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
              <polyline points="16,18 22,12 16,6"/>
              <polyline points="8,6 2,12 8,18"/>
            </svg>
          </div>
          <h3 className={styles.agentTitle}>코드 생성</h3>
          <p className={styles.agentSubtitle}>코딩 에이전트</p>
        </div>
        <div 
          className={`${styles.agentCard} ${styles.animate3}`}
          onClick={() => handleCardClick('chat')}
        >
          <div className={styles.agentIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
              <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
            </svg>
          </div>
          <h3 className={styles.agentTitle}>대화</h3>
          <p className={styles.agentSubtitle}>로컬 LLM</p>
        </div>
        <div 
          className={`${styles.agentCard} ${styles.animate4}`}
          onClick={() => handleCardClick('web')}
        >
          <div className={styles.agentIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <h3 className={styles.agentTitle}>웹 검색</h3>
          <p className={styles.agentSubtitle}>구글서치API</p>
        </div>
        <div
          className={`${styles.agentCard} ${styles.animate5}`}
          onClick={() => handleCardClick('imageAnalysis')}
        >
          <div className={styles.agentIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
              <path d="M4 7h16v12H4z" />
              <path d="m4 9 3-3h10l3 3" />
              <circle cx="12" cy="13" r="3" />
            </svg>
          </div>
          <h3 className={styles.agentTitle}>이미지 분석</h3>
          <p className={styles.agentSubtitle}>Vision 에이전트</p>
        </div>
        <div
          className={`${styles.agentCard} ${styles.animate6}`}
          onClick={() => handleCardClick('imageGeneration')}
        >
          <div className={styles.agentIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
          <h3 className={styles.agentTitle}>이미지 생성</h3>
          <p className={styles.agentSubtitle}>ComfyUI</p>
        </div>
      </div>
    </div>
  );
}
