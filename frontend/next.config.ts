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
import type { NextConfig } from "next";

const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "";

// Debug: 빌드/시작 시 환경변수 확인
console.log("[next.config.ts] Environment Variables Debug:");
console.log("  NEXT_PUBLIC_BACKEND_ORIGIN:", process.env.NEXT_PUBLIC_BACKEND_ORIGIN);
console.log("  backendOrigin:", backendOrigin);

const nextConfig: NextConfig = {
  async rewrites() {
    console.log("[next.config.ts] rewrites() - backendOrigin:", backendOrigin);
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
