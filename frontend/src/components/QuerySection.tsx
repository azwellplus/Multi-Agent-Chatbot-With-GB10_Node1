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
/* eslint-disable @next/next/no-img-element */
import type React from "react";
import { useRef, useEffect, useState, useCallback } from "react";
import styles from "@/styles/QuerySection.module.css";
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import WelcomeSection from "./WelcomeSection";

const IMAGE_MARKER_REGEX = /!\[uploaded-image]\((.*?)\)/i;
const CHAT_IMAGE_URL_REGEX = /(https?:\/\/[^\s]+\/chat_images\/[^\s]+)/i;

export function makeChatTheme(isDark: boolean) {
  const base = isDark ? oneDark : oneLight;

  const accents = isDark
    ? {
        tag:        "#E3E3E3",
        prolog:     "#E3E3E3",
        doctype:    "#E3E3E3",
        punctuation:"#99CFCF",
      }
    : {
        tag:        "#9a6700",
        prolog:     "#7a6200",
        doctype:    "#7a6200",
        punctuation:"#6b7280",
      };

  return {
    ...base,

    'pre[class*="language-"]': {
      ...(base['pre[class*="language-"]'] || {}),
      background: "transparent",
    },
    'code[class*="language-"]': {
      ...(base['code[class*="language-"]'] || {}),
      background: "transparent",
    },

    tag:         { ...(base.tag || {}),         color: accents.tag },
    prolog:      { ...(base.prolog || {}),      color: accents.prolog },
    doctype:     { ...(base.doctype || {}),     color: accents.doctype },
    punctuation: { ...(base.punctuation || {}), color: accents.punctuation },

    'attr-name': { ...(base['attr-name'] || {}), color: isDark ? "#e6b450" : "#6b4f00" },
  } as const;
}

function CodeBlockWithCopy({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Listen for theme changes
  useEffect(() => {
    const updateTheme = () => {
      const darkMode = document.documentElement.classList.contains("dark");
      setIsDark((prev) => (prev !== darkMode ? darkMode : prev));
    };

    // Set initial theme
    updateTheme();

    // Listen for changes to the document element's class list
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      } catch {}
    }
  };

  return (
    <div className={styles.codeBlock}>
      <button
        type="button"
        className={styles.copyButton}
        onClick={handleCopy}
        aria-label="Copy code"
        title={copied ? "Copied" : "Copy"}
      >
        <svg
          className={styles.copyButtonIcon}
          viewBox="0 0 460 460"
          aria-hidden="true"
          focusable="false"
          fill="currentColor"
        >
          <g>
            <g>
              <g>
                <path d="M425.934,0H171.662c-18.122,0-32.864,14.743-32.864,32.864v77.134h30V32.864c0-1.579,1.285-2.864,2.864-2.864h254.272
                c1.579,0,2.864,1.285,2.864,2.864v254.272c0,1.58-1.285,2.865-2.864,2.865h-74.729v30h74.729
                c18.121,0,32.864-14.743,32.864-32.865V32.864C458.797,14.743,444.055,0,425.934,0z"/>
                <path d="M288.339,139.998H34.068c-18.122,0-32.865,14.743-32.865,32.865v254.272C1.204,445.257,15.946,460,34.068,460h254.272
                c18.122,0,32.865-14.743,32.865-32.864V172.863C321.206,154.741,306.461,139.998,288.339,139.998z M288.341,430H34.068
                c-1.58,0-2.865-1.285-2.865-2.864V172.863c0-1.58,1.285-2.865,2.865-2.865h254.272c1.58,0,2.865,1.285,2.865,2.865v254.273h0.001
                C291.206,428.715,289.92,430,288.341,430z"/>
              </g>
            </g>
          </g>
        </svg>
        <span className={styles.copyButtonLabel}>{copied ? "Copied" : "Copy"}</span>
      </button>
      <SyntaxHighlighter
        language={language}
        style={makeChatTheme(isDark)}
        PreTag="div"
        wrapLongLines
        showLineNumbers={false}
        customStyle={{ margin: "0.6rem 0", borderRadius: 10, background: "transparent" }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}


interface QuerySectionProps {
  query: string;
  response: string;
  isStreaming: boolean;
  setQuery: (value: string) => void;
  setResponse: React.Dispatch<React.SetStateAction<string>>;
  setIsStreaming: (value: boolean) => void;
  currentChatId: string | null;
}

interface Message {
  type: "HumanMessage" | "AssistantMessage" | "ToolMessage";
  content: string;
}



export default function QuerySection({
  query,
  response,
  isStreaming,
  setQuery,
  setResponse,
  setIsStreaming,
  currentChatId,
}: QuerySectionProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [showButtons, setShowButtons] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const [toolOutput, setToolOutput] = useState("");
  const [graphStatus, setGraphStatus] = useState("");
  const [isPinnedToolOutputVisible, setPinnedToolOutputVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState(false);
  const firstTokenReceived = useRef(false);
  const hasAssistantContent = useRef(false);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const setResponseRef = useRef(setResponse);
  const setIsStreamingRef = useRef(setIsStreaming);
  const tokenBufferRef = useRef("");
  const tokenFlushScheduledRef = useRef(false);
  const tokenFlushHandleRef = useRef<number | null>(null);

  const appendAssistantChunk = useCallback((chunk: string) => {
    if (!chunk) return;
    setResponseRef.current(prev => {
      try {
        const messages = JSON.parse(prev);
        const last = messages[messages.length - 1];
        if (last && last.type === "AssistantMessage") {
          last.content = String(last.content || "") + chunk;
        } else {
          messages.push({ type: "AssistantMessage", content: chunk });
        }
        return JSON.stringify(messages);
      } catch {
        const fallbackMessages: Message[] = [];
        const previousContent = String(prev || "").trim();
        if (previousContent) {
          fallbackMessages.push({
            type: "AssistantMessage",
            content: previousContent,
          });
        }
        if (fallbackMessages.length > 0) {
          fallbackMessages[fallbackMessages.length - 1].content += chunk;
        } else {
          fallbackMessages.push({
            type: "AssistantMessage",
            content: chunk,
          });
        }
        return JSON.stringify(fallbackMessages);
      }
    });
  }, []);

  useEffect(() => {
    setResponseRef.current = setResponse;
  }, [setResponse]);

  useEffect(() => {
    setIsStreamingRef.current = setIsStreaming;
  }, [setIsStreaming]);
  const [pendingImage, setPendingImage] = useState<{ id: string; name: string; url: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const backendOrigin =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_BACKEND_ORIGIN
      ? process.env.NEXT_PUBLIC_BACKEND_ORIGIN
      : "http://192.168.108.31:8000";

  const resolveImageUrl = useCallback(
    (rawUrl: string) => {
      if (!rawUrl) return "";
      if (/^https?:\/\//i.test(rawUrl)) {
        return rawUrl;
      }
      const trimmed = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
      return `${backendOrigin}${trimmed}`;
    },
    [backendOrigin],
  );

  const extractImageToken = useCallback(
    (content: string) => {
      if (!content) return { textContent: "", imageUrl: null as string | null };
      let cleaned = content;
      let imageUrl: string | null = null;

      const markdownMatch = cleaned.match(IMAGE_MARKER_REGEX);
      if (markdownMatch) {
        imageUrl = resolveImageUrl(markdownMatch[1]);
        cleaned = cleaned.replace(markdownMatch[0], "").trim();
      }

      if (!imageUrl) {
        const urlMatch = cleaned.match(CHAT_IMAGE_URL_REGEX);
        if (urlMatch) {
          imageUrl = resolveImageUrl(urlMatch[1]);
          cleaned = cleaned.replace(urlMatch[1], "").trim();
        }
      }

      return { textContent: cleaned, imageUrl };
    },
    [resolveImageUrl],
  );

  const focusMessageInput = useCallback(() => {
    const input = messageInputRef.current;
    if (input) {
      const end = input.value.length;
      input.focus();
      input.setSelectionRange(end, end);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowButtons(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Force all links in markdown to open in new tab
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (link && link.href) {
        // Check if link is inside markdown content
        const markdownContainer = link.closest(`.${styles.markdown}`);
        if (markdownContainer) {
          e.preventDefault();
          e.stopPropagation();
          window.open(link.href, '_blank', 'noopener,noreferrer');
        }
      }
    };

    document.addEventListener('click', handleLinkClick, true);
    return () => {
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, []);


  useEffect(() => {
    const initWebSocket = async () => {
      if (!currentChatId) return;

      try {
        if (wsRef.current) {
          wsRef.current.close();
        }

        const wsProtocol = 'ws:';
        const wsHost = '192.168.108.31';
        const wsPort = '8000';
        const ws = new WebSocket(`${wsProtocol}//${wsHost}:${wsPort}/ws/chat/${currentChatId}`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          const type = msg.type
          const text = msg.data ?? msg.token ?? msg.content ?? "";
        
          switch (type) {
            case "history": {
              console.log('history messages: ', msg.messages);
              if (Array.isArray(msg.messages)) {
                // const filtered = msg.messages.filter(m => m.type !== "ToolMessage"); // TODO: add this back in
                setResponseRef.current(JSON.stringify(msg.messages));
                setIsStreamingRef.current(false);
              }
              setToolOutput("");
              if (tokenFlushHandleRef.current !== null) {
                cancelAnimationFrame(tokenFlushHandleRef.current);
                tokenFlushHandleRef.current = null;
              }
              tokenBufferRef.current = "";
              tokenFlushScheduledRef.current = false;
              firstTokenReceived.current = false;
              hasAssistantContent.current = false;
              break;
            }
            case "tool_token": {
              if (text !== undefined && text !== "undefined") {
                setToolOutput(prev => prev + text);
              }
              break;
            }
            case "token": {
              if (!text) break;
              if (!firstTokenReceived.current) {
                firstTokenReceived.current = true;
                hasAssistantContent.current = true;
              }
              tokenBufferRef.current += text;
              if (!tokenFlushScheduledRef.current) {
                tokenFlushScheduledRef.current = true;
                tokenFlushHandleRef.current = requestAnimationFrame(() => {
                  tokenFlushScheduledRef.current = false;
                  tokenFlushHandleRef.current = null;
                  const chunk = tokenBufferRef.current;
                  tokenBufferRef.current = "";
                  appendAssistantChunk(chunk);
                });
              }
              break;
            }
            case "error": {
              const errorText = text || "An unexpected error occurred.";
              console.warn("Stream error:", errorText);
              setIsStreamingRef.current(false);
              setGraphStatus("");
              setToolOutput("");
              firstTokenReceived.current = false;
              hasAssistantContent.current = false;
              if (tokenFlushHandleRef.current !== null) {
                cancelAnimationFrame(tokenFlushHandleRef.current);
                tokenFlushHandleRef.current = null;
              }
              tokenBufferRef.current = "";
              tokenFlushScheduledRef.current = false;
              setErrorMessage(errorText);
              setResponseRef.current(prev => {
                try {
                  const messages = JSON.parse(prev);
                  messages.push({ type: "AssistantMessage", content: `Warning: ${errorText}` });
                  return JSON.stringify(messages);
                } catch {
                  const fallbackMessages: Message[] = [
                    {
                      type: "AssistantMessage",
                      content: `Warning: ${errorText}`,
                    },
                  ];
                  return JSON.stringify(fallbackMessages);
                }
              });
              break;
            }
            case "node_start": {
              if (msg?.data === "generate") {
                setGraphStatus("Thinking...");
              }
              break;
            } 
            case "tool_start": {
              console.log(type, msg.data);
              setToolOutput("");
              setGraphStatus(`calling tool: ${msg?.data}`);
              break;
            }
            case "tool_end":
            case "node_end": {
              console.log(type, msg.data);
              setGraphStatus("");
              setToolOutput("");
              break;
            }
            default: {
              // ignore unknown events
            }
          }
        };

        ws.onclose = (event: CloseEvent) => {
          console.log("WebSocket connection closed");
          setIsStreamingRef.current(false);
          const abnormalClosure = !event.wasClean && event.code !== 1000;
          if (abnormalClosure) {
            setErrorMessage("채팅 연결이 예기치 않게 종료되었어요. 다시 시도해 주세요.");
          }
          if (tokenFlushHandleRef.current !== null) {
            cancelAnimationFrame(tokenFlushHandleRef.current);
            tokenFlushHandleRef.current = null;
          }
          tokenBufferRef.current = "";
          tokenFlushScheduledRef.current = false;
          firstTokenReceived.current = false;
          hasAssistantContent.current = false;
        };

        ws.onerror = (error) => {
          console.warn("WebSocket error:", error);
          setIsStreamingRef.current(false);
          setErrorMessage("백엔드와 통신하는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.");
          if (tokenFlushHandleRef.current !== null) {
            cancelAnimationFrame(tokenFlushHandleRef.current);
            tokenFlushHandleRef.current = null;
          }
          tokenBufferRef.current = "";
          tokenFlushScheduledRef.current = false;
          firstTokenReceived.current = false;
          hasAssistantContent.current = false;
        };
      } catch (error) {
        console.warn("Error initializing WebSocket:", error);
        setIsStreamingRef.current(false);
        setErrorMessage("채팅 서버와 연결할 수 없어요. 페이지를 새로고침해 주세요.");
        if (tokenFlushHandleRef.current !== null) {
          cancelAnimationFrame(tokenFlushHandleRef.current);
          tokenFlushHandleRef.current = null;
        }
        tokenBufferRef.current = "";
        tokenFlushScheduledRef.current = false;
        firstTokenReceived.current = false;
        hasAssistantContent.current = false;
      }
    };

    initWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (tokenFlushHandleRef.current !== null) {
        cancelAnimationFrame(tokenFlushHandleRef.current);
        tokenFlushHandleRef.current = null;
      }
      tokenBufferRef.current = "";
      tokenFlushScheduledRef.current = false;
    };
  }, [appendAssistantChunk, currentChatId]);

  useEffect(() => {
    try {
      const messages = JSON.parse(response);
      const hasMessages = Array.isArray(messages) && messages.length > 0;
      setShowWelcome(!hasMessages);
    } catch {
      const empty = !response.trim();
      setShowWelcome(empty);
    }
  }, [response, isStreaming]);

  // Show/hide pinnedToolOutput with fade
  useEffect(() => {
    if (graphStatus) {
      setPinnedToolOutputVisible(true);
      // Trigger fade-in on next tick
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
      setFadeIn(false);
      fadeTimeoutRef.current = setTimeout(() => setFadeIn(true), 10);
    } else {
      // Delay hiding to allow fade-out
      setFadeIn(false);
      const timeout = setTimeout(() => {
        setPinnedToolOutputVisible(false);
      }, 800); // match CSS transition duration
      return () => {
        clearTimeout(timeout);
        if (fadeTimeoutRef.current) {
          clearTimeout(fadeTimeoutRef.current);
        }
      };
    }
  }, [graphStatus]);

  const isUserScrollingRef = useRef(false);
  const isNearBottomRef = useRef(true);

  // Check if user is near the bottom of the chat
  const checkScrollPosition = useCallback(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      const threshold = 100; // pixels from bottom
      const isNear = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
      isNearBottomRef.current = isNear;
    }
  }, []);

  // Handle scroll events to detect user scrolling
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    let scrollTimer: NodeJS.Timeout;

    const handleScroll = () => {
      isUserScrollingRef.current = true;
      checkScrollPosition();
      
      // Reset user scrolling flag after scroll stops
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 150);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimer);
    };
  }, [checkScrollPosition]);

  // Auto-scroll to bottom when response changes
  useEffect(() => {
    // Only scroll if we have assistant content and user hasn't manually scrolled away
    if (!hasAssistantContent.current || isUserScrollingRef.current || !isNearBottomRef.current) {
      return;
    }

    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      }
      
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    };

    scrollToBottom();
  }, [response]);

  const handleImageButtonClick = () => {
    if (!currentChatId) {
      window.alert("채팅이 준비된 뒤에 이미지를 업로드할 수 있어요.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!currentChatId) {
      window.alert("채팅이 준비된 뒤에 이미지를 업로드할 수 있어요.");
      event.target.value = "";
      return;
    }

    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("chat_id", currentChatId);

      const responseUpload = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!responseUpload.ok) {
        throw new Error(`Image upload failed with status ${responseUpload.status}`);
      }

      const data = await responseUpload.json();
      const resolvedUrl = resolveImageUrl(data.image_url);
      setPendingImage({
        id: data.image_id,
        name: file.name,
        url: resolvedUrl,
      });
      focusMessageInput();
    } catch (error) {
      console.error("Image upload failed:", error);
      window.alert("이미지 업로드에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setIsUploadingImage(false);
      event.target.value = "";
    }
  };

  const sendQuery = (input: string) => {
    const currentQuery = input.trim();
    const hasText = currentQuery.length > 0;
    const hasImage = Boolean(pendingImage);
    if ((!hasText && !hasImage) || isStreaming || !wsRef.current || !currentChatId) {
      return;
    }
    setQuery("");
    setErrorMessage(null);
    setToolOutput("");
    setIsStreaming(true);
    firstTokenReceived.current = false;
    hasAssistantContent.current = false;
    if (tokenFlushHandleRef.current !== null) {
      cancelAnimationFrame(tokenFlushHandleRef.current);
      tokenFlushHandleRef.current = null;
    }
    tokenBufferRef.current = "";
    tokenFlushScheduledRef.current = false;

    const attachedImage = pendingImage && pendingImage.url ? pendingImage : null;
    const fallbackMessage = "이미지를 분석해줘";
    const baseMessage = hasText ? currentQuery : fallbackMessage;
    const outboundMessage = attachedImage ? `${attachedImage.url}${hasText ? `\n\n${baseMessage}` : ""}` : baseMessage;
    const imageLabel = "uploaded-image";

    try {
      wsRef.current.send(JSON.stringify({
        message: outboundMessage,
        image_id: attachedImage?.id,
      }));
 
      setResponse(prev => {
        try {
          const messages = JSON.parse(prev);
          const humanContent = attachedImage
            ? `${hasText ? `${baseMessage}\n\n` : ""}![${imageLabel}](${attachedImage.url})`
            : baseMessage;
          messages.push({
            type: "HumanMessage",
            content: humanContent
          });
          return JSON.stringify(messages);
        } catch {
          const fallbackContent = attachedImage
            ? `${hasText ? `${baseMessage}\n\n` : ""}![${imageLabel}](${attachedImage.url})`
            : baseMessage;
          const fallbackMessages: Message[] = [
            {
              type: "HumanMessage",
              content: fallbackContent,
            },
          ];
          return JSON.stringify(fallbackMessages);
        }
      });
      setPendingImage(null);
    } catch (error) {
      console.error("Error sending message:", error);
      setIsStreaming(false);
      setErrorMessage("메시지를 전송하지 못했어요. 네트워크 상태를 확인해 주세요.");
    }
  };

  const handleQuerySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendQuery(query);
  };

  const handleCancelStream = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsStreaming(false);
      if (tokenFlushHandleRef.current !== null) {
        cancelAnimationFrame(tokenFlushHandleRef.current);
        tokenFlushHandleRef.current = null;
      }
      tokenBufferRef.current = "";
      tokenFlushScheduledRef.current = false;
      firstTokenReceived.current = false;
      hasAssistantContent.current = false;
    }
  };

  // filter out all ToolMessages
  type RawMessage = {
    type?: string;
    content?: unknown;
  };

  const parseMessages = (response: string): Message[] => {
    try {
      const parsed = JSON.parse(response);
      if (!Array.isArray(parsed)) return [];
  
      return parsed
        .map((raw: RawMessage): Message => {
          const normalizedContent =
            typeof raw.content === "string" ? raw.content : String(raw.content ?? "");
          const normalizedType =
            raw.type === "HumanMessage"
              ? "HumanMessage"
              : raw.type === "ToolMessage"
              ? "ToolMessage"
              : "AssistantMessage";

          return {
            type: normalizedType,
            content: normalizedContent,
          };
        })
        .filter((msg) => msg.type !== "ToolMessage"); // discard ToolMessage completely
    } catch {
      if (!response?.trim()) return [];
      
      return [{ type: "AssistantMessage", content: String(response) }];
    }
  };

  const parsedMessages = parseMessages(response);
  let assistantMessageCounter = 0;
  const shouldExpandMessages = parsedMessages.length > 0 || isStreaming || toolOutput.trim().length > 0;
  const messagesContainerClass = [
    styles.messagesContainer,
    !shouldExpandMessages ? styles.messagesContainerCompact : "",
  ]
    .filter(Boolean)
    .join(" ");
  const canSendMessage = query.trim().length > 0 || Boolean(pendingImage);
  const imageButtonDisabled = isUploadingImage || !currentChatId;

  const markdownComponents: Components = {
    code(nodeProps) {
      const { inline, className, children, ...props } = nodeProps as {
        inline?: boolean;
        className?: string;
        children?: React.ReactNode;
      } & React.HTMLAttributes<HTMLElement>;
      const match = /language-(\w+)/.exec(className || "");
      const code = String(children ?? "").replace(/\n$/, "");

      if (inline || !match) {
        return (
          <code className={className} {...props}>
            {code}
          </code>
        );
      }

      return <CodeBlockWithCopy code={code} language={match[1]} />;
    },
    a(nodeProps) {
      const { href, children, ...props } = nodeProps as {
        href?: string;
        children?: React.ReactNode;
      } & React.HTMLAttributes<HTMLAnchorElement>;

      // Force open in new tab - multiple prevention methods
      const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (href) {
          // Use multiple methods to ensure new tab opens
          const newWindow = window.open(href, '_blank', 'noopener,noreferrer');
          if (!newWindow) {
            // Fallback if popup blocker
            window.location.href = href;
          }
        }
        return false;
      };

      const handleMouseDown = (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Prevent middle click from opening in same tab
        if (e.button === 1) {
          e.preventDefault();
        }
      };

      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          data-external-link="true"
          {...props}
        >
          {children}
        </a>
      );
    },
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatSurface}>
        {isPinnedToolOutputVisible && (
          <div
            className={`${styles.pinnedToolOutput} ${
              !fadeIn ? styles.pinnedToolOutputHidden : ""
            }`}
          >
            <div className={styles.toolHeader}>
              <span className={styles.toolLabel}>{graphStatus || "Tool output"}</span>
            </div>
            {toolOutput && <pre className={styles.toolBody}>{toolOutput}</pre>}
          </div>
        )}

        {errorMessage && (
          <div className={styles.errorBanner} role="alert">
            <span>{errorMessage}</span>
            <button
              type="button"
              className={styles.errorDismissButton}
              aria-label="오류 메시지 닫기"
              onClick={() => setErrorMessage(null)}
            >
              닫기
            </button>
          </div>
        )}

        {showWelcome && (
          <div className={styles.welcomeCard}>
            <WelcomeSection setQuery={setQuery} />
          </div>
        )}

        <div className={messagesContainerClass} ref={chatContainerRef}>
          {parsedMessages.map((message, index) => {
            const isHuman = message.type === "HumanMessage";
            const key = `${message.type}-${index}`;
            const { textContent, imageUrl } = extractImageToken(message.content || "");
            const agentIndex = !isHuman ? ++assistantMessageCounter : null;
            const shouldShowImage = isHuman && imageUrl;
            const hasTextContent = Boolean(textContent && textContent.trim().length > 0);

            if (!hasTextContent && !imageUrl) return null;

            return (
              <div
                key={key}
                className={`${styles.messageWrapper} ${isHuman ? styles.userMessageWrapper : styles.assistantMessageWrapper}`}
                data-agent-index={agentIndex ? String(agentIndex) : undefined}
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >

              <div className={`${styles.message} ${isHuman ? styles.userMessage : styles.assistantMessage}`}>
                {hasTextContent && (
                  <div className={styles.markdown}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {textContent}
                    </ReactMarkdown>
                  </div>
                )}
                {shouldShowImage && (
                  <div className={styles.messageImagePreview}>
                    <img src={imageUrl!} alt="업로드한 이미지" />
                  </div>
                )}
              </div>
              </div>
            );
          })}

        {isStreaming && (
          <div
            className={`${styles.messageWrapper} ${styles.assistantMessageWrapper}`}
            style={{
              animationDelay: `${parsedMessages.length * 0.1}s`
            }}
          >
            <div className={`${styles.message} ${styles.assistantMessage}`}>
              <div className={styles.typingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
        </div>
      </div>

      <form onSubmit={handleQuerySubmit} className={styles.inputContainer}>
        <div className={styles.inputWrapper}>
          <div className={styles.inputRow}>
            <div className={styles.imageUploadWrapper}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className={styles.hiddenFileInput}
                onChange={handleImageUpload}
                aria-label="분석할 이미지 선택"
              />
              <button
                type="button"
                onClick={handleImageButtonClick}
                disabled={imageButtonDisabled}
                className={`${styles.imageUploadButton} ${showButtons ? styles.show : ""}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M4 7h16v12H4z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="m4 9 3.5-3.5h9L20 9" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
                <span className={styles.imageUploadLabel}>
                  {isUploadingImage ? (
                    "업로드 중"
                  ) : (
                    <>
                      이미지
                      <br />업로드
                    </>
                  )}
                </span>
              </button>
            </div>

            <div className={styles.messageInputContainer}>
              <textarea
                rows={1}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="무엇이든 물어보세요."
                disabled={isStreaming}
                className={`${styles.messageInput} ${pendingImage ? styles.messageInputWithPreview : ""}`}
                ref={messageInputRef}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendQuery(query);
                  }
                }}
              />
              {pendingImage && (
                <div className={styles.pendingImageOverlay}>
                  <img src={pendingImage.url} alt="업로드한 이미지 미리보기" />
                  <button
                    type="button"
                    className={styles.pendingImageRemoveButton}
                    onClick={() => setPendingImage(null)}
                    aria-label="업로드한 이미지 제거"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div className={styles.sendWrapper}>
              {!isStreaming ? (
                <button
                  type="submit"
                  className={`${styles.sendButton} ${showButtons ? styles.show : ""}`}
                  disabled={!canSendMessage || !currentChatId}
                  aria-label="Send message"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                    <path d="M5 12h9a4 4 0 0 0 4-4V4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 12l6-6m-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCancelStream}
                  className={`${styles.streamingCancelButton} ${showButtons ? styles.show : ""}`}
                >
                  Stop
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
