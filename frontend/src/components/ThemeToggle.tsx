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

import { useState, useEffect, useCallback } from "react";
import styles from "@/styles/ThemeToggle.module.css";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  const applyTheme = useCallback((useDark: boolean) => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    root.classList.toggle("dark", useDark);
    root.classList.toggle("light", !useDark);
    root.style.colorScheme = useDark ? "dark" : "light";
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const storedTheme = localStorage.getItem("theme");
    const shouldUseDark = storedTheme === "dark" || (!storedTheme && prefersDark);

    setIsDark(shouldUseDark);
    applyTheme(shouldUseDark);
  }, [applyTheme]);

  const toggleTheme = () => {
    setIsDark((previous) => {
      const next = !previous;
      applyTheme(next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={styles.toggle}
      aria-label="Toggle theme"
      aria-pressed={isDark}
    >
      <span className={styles.icon} aria-hidden="true">
        {isDark ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.64 17.657A9 9 0 0017.657 5.64 6.5 6.5 0 115.64 17.657z"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v1.5m0 13V20M4 12h1.5M18.5 12H20m-2.95-5.05l1.06 1.06M6.89 17.11l-1.06 1.06m0-12.22l1.06 1.06M17.11 17.11l1.06 1.06M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        )}
      </span>
      <span className={styles.label}>{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
