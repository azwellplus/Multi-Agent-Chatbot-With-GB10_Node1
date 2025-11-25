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
import React, { useState, useEffect, useCallback } from "react";
import styles from "@/styles/Sidebar.module.css";
import ThemeToggle from "@/components/ThemeToggle";
import AzwellLogo from "@/components/AzwellLogo";

interface Model {
  id: string;
  name: string;
}

interface ChatMetadata {
  name: string;
}

interface SidebarProps {
  showIngestion: boolean;
  setShowIngestion: (value: boolean) => void;
  refreshTrigger?: number;
  currentChatId: string | null;
  onChatChange: (chatId: string) => Promise<void>;
}

const SECTION_KEYS = ["model", "context", "history"] as const;

type SourceOption = {
  name: string;
  taskId: string | null;
};

export default function Sidebar({
  setShowIngestion,
  refreshTrigger = 0,
  currentChatId,
  onChatChange,
}: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(SECTION_KEYS),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [availableSources, setAvailableSources] = useState<SourceOption[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [chats, setChats] = useState<string[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [chatMetadata, setChatMetadata] = useState<Record<string, ChatMetadata>>({});

  const fetchAvailableModels = useCallback(async () => {
    try {
      setIsLoadingModels(true);
      const response = await fetch("/api/available_models");
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching available models: ${response.status} - ${errorText}`);
        return;
      }

      const data = await response.json();
      const models = data.models.map((modelId: string) => ({
        id: modelId,
        name: modelId
          .split("-")
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
      }));
      setAvailableModels(models);
    } catch (error) {
      console.error("Error fetching available models:", error);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      setIsLoadingSources(true);
      const response = await fetch("/api/sources");
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching sources: ${response.status} - ${errorText}`);
        setAvailableSources([]);
        return;
      }

      const data = await response.json();
      const parsedSources: SourceOption[] = Array.isArray(data.sources)
        ? data.sources
            .map((entry: unknown) => {
              if (typeof entry === "string") {
                return { name: entry, taskId: null };
              }
              if (entry && typeof entry === "object") {
                const sourceEntry = entry as { name?: unknown; task_id?: unknown };
                const name =
                  typeof sourceEntry.name === "string" && sourceEntry.name.trim().length > 0
                    ? sourceEntry.name
                    : null;
                if (!name) {
                  return null;
                }
                const taskId =
                  typeof sourceEntry.task_id === "string" && sourceEntry.task_id.trim().length > 0
                    ? sourceEntry.task_id
                    : null;
                return { name, taskId };
              }
              return null;
            })
            .filter((entry): entry is SourceOption => entry !== null)
        : [];

      setAvailableSources(parsedSources);
      setSelectedSources((previous) =>
        previous.filter((name) => parsedSources.some((source) => source.name === name)),
      );
    } catch (error) {
      console.error("Error fetching sources:", error);
      setAvailableSources([]);
    } finally {
      setIsLoadingSources(false);
    }
  }, []);

  const fetchChatMetadata = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat/${chatId}/metadata`);
      if (response.ok) {
        const metadata = await response.json();
        setChatMetadata((previous) => ({
          ...previous,
          [chatId]: metadata,
        }));
      }
    } catch (error) {
      console.error(`Error fetching metadata for chat ${chatId}:`, error);
    }
  }, []);

  const fetchChats = useCallback(async () => {
    try {
      setIsLoadingChats(true);
      const response = await fetch("/api/chats");
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats);
        await Promise.all(data.chats.map(fetchChatMetadata));
      } else {
        console.error("Failed to fetch chats:", response.status);
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
    } finally {
      setIsLoadingChats(false);
    }
  }, [fetchChatMetadata]);

  useEffect(() => {
    let isMounted = true;
    const loadInitialConfig = async () => {
      try {
        setIsLoading(true);
        const modelResponse = await fetch("/api/selected_model");
        if (modelResponse.ok) {
          const { model } = await modelResponse.json();
          if (isMounted) {
            setSelectedModel(model);
          }
        }

        const sourcesResponse = await fetch("/api/selected_sources");
        if (sourcesResponse.ok) {
          const { sources } = await sourcesResponse.json();
          if (isMounted) {
            setSelectedSources(sources);
          }
        }

        await Promise.all([fetchAvailableModels(), fetchSources()]);
        await fetchChats();
      } catch (error) {
        console.error("Error loading initial config:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInitialConfig();
    return () => {
      isMounted = false;
    };
  }, [fetchAvailableModels, fetchSources, fetchChats]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchSources();
    }
  }, [refreshTrigger, fetchSources]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleSourcesUpdate = (event: Event) => {
      const detail = (event as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) {
        setSelectedSources(detail);
      }
    };

    window.addEventListener("sources:update", handleSourcesUpdate);
    return () => {
      window.removeEventListener("sources:update", handleSourcesUpdate);
    };
  }, []);

  useEffect(() => {
    if (expandedSections.has("context")) {
      fetchSources();
    }
  }, [expandedSections, fetchSources]);

  useEffect(() => {
    if (expandedSections.has("history")) {
      fetchChats();
    }
  }, [expandedSections, fetchChats]);

  const toggleSection = (section: string) => {
    setExpandedSections((previous) => {
      const next = new Set(previous);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const isSectionExpanded = (section: string) => expandedSections.has(section);

  const handleSourceToggle = async (source: string) => {
    const previousSources = selectedSources;
    const nextSources = previousSources.includes(source)
      ? previousSources.filter((entry) => entry !== source)
      : [...previousSources, source];

    setSelectedSources(nextSources);

    try {
      const response = await fetch("/api/selected_sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSources),
      });

      if (!response.ok) {
        console.error("Failed to update selected sources");
        setSelectedSources(previousSources);
        return;
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sources:update", { detail: nextSources }));
      }
    } catch (error) {
      console.error("Error updating selected sources:", error);
      setSelectedSources(previousSources);
    }
  };

  const handleSourceDelete = async (taskId: string) => {
    try {
      const response = await fetch(`/api/ingest/${taskId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchSources();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("sources:update"));
        }
      } else {
        console.error("Failed to delete source", taskId);
      }
    } catch (error) {
      console.error("Error deleting source:", error);
    }
  };

  const handleChatSelect = async (chatId: string) => {
    try {
      await onChatChange(chatId);
    } catch (error) {
      console.error("Error selecting chat:", error);
    }
  };

  const handleRenameChat = async (chatId: string, currentName: string) => {
    const newName = prompt("Enter new chat name:", currentName);
    if (newName && newName.trim() && newName !== currentName) {
      try {
        const response = await fetch("/api/chat/rename", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, new_name: newName.trim() }),
        });

        if (!response.ok) {
          console.error("Failed to rename chat");
          return;
        }

        await fetchChatMetadata(chatId);
      } catch (error) {
        console.error("Error renaming chat:", error);
      }
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat/${chatId}`, { method: "DELETE" });
      if (!response.ok) {
        console.error("Failed to delete chat");
        return;
      }

      await fetchChats();

      if (currentChatId === chatId) {
        const chatsResponse = await fetch("/api/chats");
        const { chats: remainingChats } = await chatsResponse.json();
        if (remainingChats.length > 0) {
          await onChatChange(remainingChats[0]);
        } else {
          await handleNewChat();
        }
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  const handleNewChat = async () => {
    try {
      const response = await fetch("/api/chat/new", { method: "POST" });
      if (!response.ok) {
        console.error("Failed to create new chat");
        return;
      }

      const data = await response.json();
      await fetchChats();
      await onChatChange(data.chat_id);
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  };

  const handleClearAllChats = async () => {
    if (chats.length === 0) {
      return;
    }

    const confirmClear = window.confirm(
      `Clear all ${chats.length} chat conversations? This action cannot be undone.`,
    );
    if (!confirmClear) {
      return;
    }

    try {
      const response = await fetch("/api/chats/clear", { method: "DELETE" });
      if (!response.ok) {
        console.error("Failed to clear all chats");
        alert("Failed to clear chats. Please try again.");
        return;
      }

      const data = await response.json();
      await onChatChange(data.new_chat_id);
      await fetchChats();
    } catch (error) {
      console.error("Error clearing chats:", error);
      alert("An error occurred while clearing chats. Please try again.");
    }
  };

  const handleModelChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = event.target.value;
    const previousModel = selectedModel;
    setSelectedModel(newModel);

    try {
      const response = await fetch("/api/selected_model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: newModel }),
      });

      if (!response.ok) {
        console.error("Failed to update selected model");
        setSelectedModel(previousModel);
      }
    } catch (error) {
      console.error("Error updating selected model:", error);
      setSelectedModel(previousModel);
    }
  };


  return (
    <div className={styles.sidebar}>
      <div className={styles.panelHeader}>
        <AzwellLogo className={styles.panelLogo} />
        <p className={styles.panelDescription}>
          Multi-agent chatbot workspace
        </p>
        <button type="button" className={styles.newChatPill} onClick={handleNewChat}>
          <span aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M10 4v12M4 10h12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          New Chat
        </button>
      </div>

      <div className={styles.sections} data-loading={isLoading}>
        {/* Model */}
        <section className={`${styles.section} ${isSectionExpanded("model") ? styles.open : ""}`}>
          <button
            type="button"
            className={styles.sectionHeader}
            onClick={() => toggleSection("model")}
            aria-expanded={isSectionExpanded("model")}
          >
            <span className={styles.sectionTitle}>Supervisor model</span>
            <span className={`${styles.chevron} ${isSectionExpanded("model") ? styles.rotated : ""}`}>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
          <div
            className={`${styles.sectionBody} ${!isSectionExpanded("model") ? styles.sectionBodyHidden : ""}`}
            aria-hidden={!isSectionExpanded("model")}
          >
            <div className={styles.selectWrapper}>
              <select
                id="model-select"
                className={styles.modelSelect}
                value={selectedModel}
                onChange={handleModelChange}
                disabled={isLoadingModels}
                aria-label="Select supervisor model"
              >
                {isLoadingModels ? (
                  <option value="">Loading models...</option>
                ) : (
                  availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </section>

        {/* Context */}
        <section
          className={`${styles.section} ${isSectionExpanded("context") ? styles.open : ""}`}
        >
          <div className={styles.sectionHeaderRow}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => toggleSection("context")}
              aria-expanded={isSectionExpanded("context")}
            >
              <span className={styles.sectionTitle}>
                <span className={styles.sectionTitleText}>Context sources</span>
                <span
                  role="button"
                  tabIndex={isLoadingSources ? -1 : 0}
                  aria-disabled={isLoadingSources}
                  title="Refresh sources"
                  aria-label="Refresh sources"
                  className={`${styles.ghostButton} ${styles.iconButton} ${styles.sectionTitleAction}`}
                  onClick={(event) => {
                    if (isLoadingSources) {
                      return;
                    }
                    event.stopPropagation();
                    void fetchSources();
                  }}
                  onKeyDown={(event) => {
                    if (isLoadingSources) {
                      return;
                    }
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      void fetchSources();
                    }
                  }}
                >
                  <span className={styles.srOnly}>Refresh list</span>
                  <span aria-hidden="true" className={styles.iconButtonInner}>
                    {isLoadingSources ? (
                      <span className={styles.spinner} />
                    ) : (
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 4v2.5l3-3-3-3V3a7 7 0 0 0-6.93 6.06"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 16v-2.5l-3 3 3 3V17a7 7 0 0 0 6.93-6.06"
                        />
                      </svg>
                    )}
                  </span>
                </span>
              </span>
              <span
                className={`${styles.chevron} ${isSectionExpanded("context") ? styles.rotated : ""}`}
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          </div>
          <div
            className={`${styles.sectionBody} ${!isSectionExpanded("context") ? styles.sectionBodyHidden : ""}`}
            aria-hidden={!isSectionExpanded("context")}
          >
            <div className={styles.sourcesList}>
              {isLoadingSources ? (
                <div className={styles.emptyState}>Loading sources...</div>
              ) : availableSources.length === 0 ? (
                <div className={styles.emptyState}>No sources available yet.</div>
              ) : (
                availableSources.map((source, index) => {
                  const checked = selectedSources.includes(source.name);
                  const checkboxId = `source-${index}`;
                  return (
                    <div key={`${source.name}-${index}`} className={styles.sourceItem}>
                      <label
                        htmlFor={checkboxId}
                        className={styles.sourceItemLabel}
                      >
                        <input
                          id={checkboxId}
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleSourceToggle(source.name)}
                        />
                        <span className={styles.sourceItemName}>{source.name}</span>
                      </label>
                      {source.taskId && (
                        <button
                          type="button"
                          className={styles.sourceDeleteButton}
                          onClick={() => handleSourceDelete(source.taskId!)}
                          aria-label={`${source.name} 삭제`}
                        >
                          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 6h10" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 6V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6v9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9v4M12 9v4" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className={styles.sectionFooter}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setShowIngestion(true)}
              >
                <span aria-hidden="true">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12.75 4.75h2.5v10.5a1 1 0 0 1-1 1h-8.5a1 1 0 0 1-1-1v-10.5h2.5"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.75 4.75V3.5a1 1 0 0 1 1-1h0.5a1 1 0 0 1 1 1v1.25"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8.5h6" />
                  </svg>
                </span>
                Upload docs
              </button>
            </div>
          </div>
        </section>

        {/* Chat history */}
        <section
          className={`${styles.section} ${isSectionExpanded("history") ? styles.open : ""}`}
        >
          <button
            type="button"
            className={`${styles.sectionHeader} ${styles.sectionHeaderWithActions}`}
            onClick={() => toggleSection("history")}
            aria-expanded={isSectionExpanded("history")}
          >
            <div className={styles.sectionHeaderContent}>
              <span className={styles.sectionTitle}>Recent conversations</span>
              <div className={styles.sectionMeta}>
                <span className={styles.sectionSessions}>
                  {chats.length > 0 ? `${chats.length} session${chats.length > 1 ? "s" : ""}` : "No saved chats"}
                </span>
                <span
                  role="button"
                  tabIndex={chats.length === 0 ? -1 : 0}
                  aria-disabled={chats.length === 0}
                  className={styles.clearAllInline}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (chats.length === 0) {
                      return;
                    }
                    handleClearAllChats();
                  }}
                  onKeyDown={(event) => {
                    if (chats.length === 0) {
                      return;
                    }
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      handleClearAllChats();
                    }
                  }}
                >
                  Clear All
                </span>
              </div>
            </div>
            <span
              className={`${styles.chevron} ${isSectionExpanded("history") ? styles.rotated : ""}`}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
          <div
            className={`${styles.sectionBody} ${!isSectionExpanded("history") ? styles.sectionBodyHidden : ""}`}
            aria-hidden={!isSectionExpanded("history")}
          >
            {isLoadingChats ? (
              <div className={styles.emptyState}>Loading chat history…</div>
            ) : chats.length === 0 ? (
              <div className={styles.emptyState}>Start a conversation to see it here.</div>
            ) : (
              <div className={styles.chatList}>
                {chats.map((chatId) => {
                  const isActive = currentChatId === chatId;
                  const displayName = chatMetadata[chatId]?.name || chatId.slice(0, 8);

                  return (
                    <div
                      key={chatId}
                      className={`${styles.chatItem} ${isActive ? styles.chatItemActive : ""}`}
                    >
                      <button
                        type="button"
                        className={styles.chatSelect}
                        onClick={() => handleChatSelect(chatId)}
                      >
                        <span className={styles.chatName}>{displayName}</span>
                        {isActive && <span className={styles.activeBadge}>Active</span>}
                      </button>
                      <div className={styles.chatActions}>
                        <button
                          type="button"
                          className={styles.chatAction}
                          onClick={() =>
                            handleRenameChat(chatId, chatMetadata[chatId]?.name || displayName)
                          }
                          aria-label="Rename chat"
                        >
                          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.5 13.5 3.5 17l3.5-1 9-9a1.5 1.5 0 0 0-2-2l-9 9Z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={styles.chatAction}
                          onClick={() => handleDeleteChat(chatId)}
                          aria-label="Delete chat"
                        >
                          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5.5 6h9m-7 0 .5-1.5a1 1 0 0 1 .95-.7h1.1a1 1 0 0 1 .95.7L11.5 6m3 0v8.5a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V6"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className={styles.footer}>
        <div className={styles.themeBlock} aria-labelledby="theme-selector-heading">
          <span id="theme-selector-heading" className={`${styles.sectionTitle} ${styles.themeLabel}`}>
            테마 선택
          </span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
