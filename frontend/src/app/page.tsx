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
"use client";
import { useState, useEffect } from 'react';
import QuerySection from '@/components/QuerySection';
import DocumentIngestion from '@/components/DocumentIngestion';
import Sidebar from '@/components/Sidebar';
import styles from '@/styles/Home.module.css';

export default function Home() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("[]");
  const [files, setFiles] = useState<FileList | null>(null);
  const [ingestMessage, setIngestMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [showIngestion, setShowIngestion] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);

  // Load initial chat ID
  useEffect(() => {
    const fetchCurrentChatId = async () => {
      try {
        // First, try to get chat_id from localStorage
        const savedChatId = localStorage.getItem('currentChatId');
        if (savedChatId) {
          // Verify the saved chat_id still exists in the backend
          const metadataResponse = await fetch(`/api/chat/${savedChatId}/metadata`);
          if (metadataResponse.ok) {
            // Chat exists, use it
            setCurrentChatId(savedChatId);
            // Also update backend's current chat ID
            await fetch("/api/chat_id", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: savedChatId })
            });
            return;
          } else {
            // Chat doesn't exist anymore, remove from localStorage
            localStorage.removeItem('currentChatId');
          }
        }

        // No saved chat or it doesn't exist, get from backend
        const response = await fetch("/api/chat_id");
        if (response.ok) {
          const { chat_id } = await response.json();
          setCurrentChatId(chat_id);
          // Save to localStorage
          if (chat_id) {
            localStorage.setItem('currentChatId', chat_id);
          }
        }
      } catch (error) {
        console.error("Error fetching current chat ID:", error);
      }
    };
    fetchCurrentChatId();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileLayout(window.innerWidth <= 1080);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobileLayout) {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  }, [isMobileLayout]);

  useEffect(() => {
    if (isMobileLayout && !isSidebarCollapsed) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    return undefined;
  }, [isMobileLayout, isSidebarCollapsed]);

  useEffect(() => {
    if (showIngestion) {
      setFiles(null);
      setIngestMessage("");
      setIsIngesting(false);
    }
  }, [showIngestion]);

  // Handle chat changes
  const handleChatChange = async (newChatId: string) => {
    if (newChatId === currentChatId) {
      return;
    }
    try {
      const response = await fetch("/api/chat_id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: newChatId })
      });

      if (response.ok) {
        setCurrentChatId(newChatId);
        setResponse("[]"); // Clear current chat messages with empty JSON array
        // Save to localStorage
        localStorage.setItem('currentChatId', newChatId);
      }
    } catch (error) {
      console.error("Error updating chat ID:", error);
    }
  };

  // Function to handle successful document ingestion
  const handleSuccessfulIngestion = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const workspaceClassNames = [
    styles.workspace,
    isSidebarCollapsed ? styles.workspaceCollapsed : "",
    isMobileLayout ? styles.workspaceMobile : "",
  ]
    .filter(Boolean)
    .join(" ");

  const sidebarClassNames = [
    styles.sidebarPane,
    isMobileLayout ? styles.sidebarPaneMobile : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.shell}>
      <button
        type="button"
        className={`${styles.sidebarToggle} ${isSidebarCollapsed ? styles.sidebarToggleCollapsed : ""}`}
        onClick={() => setIsSidebarCollapsed((prev) => !prev)}
        aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isSidebarCollapsed ? (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 5l5 5-5 5" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5l-5 5 5 5" />
          </svg>
        )}
      </button>

      {isMobileLayout && !isSidebarCollapsed && (
        <div
          className={styles.mobileSidebarOverlay}
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      <div
        className={workspaceClassNames}
      >
        {!isSidebarCollapsed && (
          <aside className={sidebarClassNames}>
            <Sidebar
              showIngestion={showIngestion}
              setShowIngestion={setShowIngestion}
              refreshTrigger={refreshTrigger}
              currentChatId={currentChatId}
              onChatChange={handleChatChange}
            />
          </aside>
        )}

        <main className={styles.chatStage}>
          <QuerySection
            query={query}
            response={response}
            isStreaming={isStreaming}
            setQuery={setQuery}
            setResponse={setResponse}
            setIsStreaming={setIsStreaming}
            currentChatId={currentChatId}
          />
        </main>
      </div>

      {showIngestion && (
        <>
          <div className={styles.overlay} onClick={() => setShowIngestion(false)} />
          <div className={styles.documentUploadContainer} role="dialog" aria-modal="true">
            <DocumentIngestion
              files={files}
              ingestMessage={ingestMessage}
              isIngesting={isIngesting}
              setFiles={setFiles}
              setIngestMessage={setIngestMessage}
              setIsIngesting={setIsIngesting}
              onSuccessfulIngestion={handleSuccessfulIngestion}
              onRequestClose={() => setShowIngestion(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}
