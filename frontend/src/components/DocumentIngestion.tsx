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
import { useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent } from 'react';
import styles from '@/styles/DocumentIngestion.module.css';

declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

interface DocumentIngestionProps {
  files: FileList | null;
  ingestMessage: string;
  isIngesting: boolean;
  setFiles: (files: FileList | null) => void;
  setIngestMessage: (message: string) => void;
  setIsIngesting: (value: boolean) => void;
  onSuccessfulIngestion?: () => void;
  onRequestClose?: () => void;
}

type UploadedTask = {
  taskId: string;
  files: string[];
  status?: string;
};

export default function DocumentIngestion({
  files,
  ingestMessage,
  isIngesting,
  setFiles,
  setIngestMessage,
  setIsIngesting,
  onSuccessfulIngestion,
  onRequestClose
}: DocumentIngestionProps) {
  const [uploadedTasks, setUploadedTasks] = useState<UploadedTask[]>([]);
  const [deletingTaskIds, setDeletingTaskIds] = useState<string[]>([]);
  const totalUploadedFiles = uploadedTasks.reduce(
    (total, task) => total + task.files.length,
    0
  );

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const handleIngestSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsIngesting(true);
    setIngestMessage("");
    
    try {
      if (files && files.length > 0) {
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
          formData.append("files", files[i]);
        }
        
        const res = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
        });
        
        const data = await res.json();
        setIngestMessage(data.message);
        
        if (res.ok) {
          if (typeof e.target === "object" && e.target && "reset" in e.target && typeof e.target.reset === "function") {
            e.target.reset();
          }
          setFiles(null);

          const taskId = data.task_id as string | undefined;
          const taskFiles = Array.isArray(data.files) ? data.files : [];
          if (taskId && taskFiles.length > 0) {
            const nextTask: UploadedTask = {
              taskId,
              files: taskFiles,
              status: data.status,
            };
            setUploadedTasks((previous) => {
              const filtered = previous.filter((task) => task.taskId !== taskId);
              return [nextTask, ...filtered];
            });
          }
          if (onSuccessfulIngestion) {
            onSuccessfulIngestion();
          }
        }
      } else {
        setIngestMessage("Please select files or specify a directory path.");
      }
    } catch (error) {
      console.error("Error during ingestion:", error);
      setIngestMessage("Error during ingestion. Please check the console for details.");
    } finally {
      setIsIngesting(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(e.dataTransfer.files);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (deletingTaskIds.includes(taskId)) return;

    setDeletingTaskIds((previous) => [...previous, taskId]);

    try {
      const response = await fetch(`/api/ingest/${taskId}`, {
        method: "DELETE",
      });

      let data: { message?: string } | null = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (response.ok) {
        setUploadedTasks((previous) => previous.filter((task) => task.taskId !== taskId));
        setIngestMessage(data?.message ?? "Selected documents were removed.");
        if (onSuccessfulIngestion) {
          onSuccessfulIngestion();
        }
      } else {
        setIngestMessage(data?.message ?? "Failed to remove uploaded documents.");
      }
    } catch (error) {
      console.error("Error deleting uploaded documents:", error);
      setIngestMessage("Error deleting uploaded documents. Please check the console for details.");
    } finally {
      setDeletingTaskIds((previous) => previous.filter((id) => id !== taskId));
    }
  };

  return (
    <div className={styles.section}>
      {onRequestClose && (
        <button
          type="button"
          className={styles.inlineCloseButton}
          onClick={onRequestClose}
          aria-label="Close document ingestion panel"
        >
          ×
        </button>
      )}
      <div className={styles.modalHeader}>
        <span className={styles.modalBadge}>Knowledge upload</span>
        <h1 className={styles.modalTitle}>Document ingestion</h1>
        <p className={styles.modalSubtitle}>
          Drop curated datasets to ground the multi-agent workspace. PDFs, text files, and zipped corpora are supported.
        </p>
      </div>

      <form onSubmit={handleIngestSubmit} className={styles.ingestForm}>
        <div
          className={styles.uploadSection}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <label htmlFor="file-upload" className={styles.customFileLabel}>
            <span className={styles.uploadIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16V4m0 0 3.5 3.5M12 4 8.5 7.5M6 14v3.5a2.5 2.5 0 0 0 2.5 2.5h7a2.5 2.5 0 0 0 2.5-2.5V14"
                />
              </svg>
            </span>
            <span>Choose files</span>
          </label>
          <input
            id="file-upload"
            type="file"
            multiple
            accept=".txt,.md,.markdown,.html,.htm,.pdf,.doc,.docx,.csv,.tsv,.json,.yaml,.yml"
            onChange={handleFileChange}
            disabled={isIngesting}
            className={styles.fileInput}
          />
          <span className={styles.fileName}>
            {files && files.length > 0 ? Array.from(files).map(f => f.name).join(', ') : "No file chosen"}
          </span>
          <p className={styles.helpText}>
            Drag & drop files or click to browse. Uploading a directory? Zip it first for the best results.
          </p>
        </div>
        
        <button 
          type="submit" 
          disabled={isIngesting || !files}
          className={styles.ingestButton}
        >
          {isIngesting ? "Ingesting..." : "Ingest Documents"}
        </button>
      </form>

      {uploadedTasks.length > 0 && (
        <div className={styles.uploadedTasks}>
          <div className={styles.uploadedTasksHeader}>
            <h2 className={styles.uploadedTasksTitle}>Uploaded documents</h2>
            <span className={styles.uploadedTasksCaption}>
              {totalUploadedFiles} file{totalUploadedFiles === 1 ? "" : "s"}
            </span>
          </div>
          <ul className={styles.uploadedTaskList}>
            {uploadedTasks.map((task) =>
              task.files.map((file) => (
                <li key={`${task.taskId}-${file}`} className={styles.uploadedTaskItem}>
                  <span className={styles.uploadedFileName} title={file}>
                    {file}
                  </span>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDeleteTask(task.taskId)}
                    aria-label={`${file} 삭제`}
                    disabled={deletingTaskIds.includes(task.taskId)}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M5 6h14l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
                    </svg>
                  </button>
                </li>
              )),
            )}
          </ul>
        </div>
      )}

      {ingestMessage && (
        <div className={styles.messageContainer}>
          <p>{ingestMessage}</p>
        </div>
      )}
    </div>
  );
} 
