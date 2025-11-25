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

import type { SVGProps } from "react";

export default function AzwellLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 198 34"
      role="img"
      aria-label="Azwell AI"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>Azwell AI</title>
      <defs>
        <style>
          {`.logo-text{fill:currentColor;stroke:currentColor;stroke-width:1}
.logo-text-shade{opacity:.2;fill:#181e0e;stroke:#181e0e;stroke-width:1}
.logo-accent{fill:#75b142;stroke:#75b142;stroke-width:1}
.logo-accent-soft{opacity:.52;fill:#74af41;stroke:#74af41;stroke-width:1}`}
        </style>
      </defs>
      <path
        className="logo-text-shade"
        d="M189.5 1 192 1.5 189 2q1.3 4.6-2.5 6-6.3-2.2-4.5 3.5h-.5q-.7-3.7 1.5-4.5 6.8 2.3 4.5-4.5Z"
      />
      <path className="logo-text-shade" d="m193.5 7 4.5.5-4.5.5Z" />
      <path className="logo-text-shade" d="m166.5 8 .5 23.5H166Z" />
      <path className="logo-text-shade" d="m188.5 12 .5 4.5h-1Z" />
      <path className="logo-text-shade" d="m134.5 17 9.5.5-9.5.5Z" />
      <path className="logo-text-shade" d="m53.5 22 3.5.5-3.5.5Z" />
      <path className="logo-text-shade" d="m51.5 27 7.5.5-7.5.5Z" />
      <path className="logo-text-shade" d="m164.5 28 .5 3.5h-1Z" />
      <path
        className="logo-accent"
        opacity=".98"
        d="M16.5 2 20 4.5 24 13.5 20.5 19 18.5 16q-4-.5-4.5 2.5L5.5 33 0 32 2 25.5 16.5 2Z"
      />
      <path className="logo-accent-soft" d="m15.5 2-.5 1.5-1.5 2.5.5-1.5Z" />
      <path className="logo-accent-soft" d="M18.5 2 22 6.5 20 5.5Z" />
      <path className="logo-accent-soft" d="m12.5 7-.5 1.5-2.5 4.5.5-1.5Z" />
      <path className="logo-accent-soft" d="m22.5 8 2.5 4.5h-1Z" />
      <path className="logo-accent-soft" d="m8.5 14-.5 1.5-1.5 2.5.5-1.5Z" />
      <path className="logo-accent-soft" d="m16.5 16 3.5 1.5L18.5 17l-4 2Z" />
      <path className="logo-accent-soft" d="m13.5 20-.5 1.5-1.5 2.5.5-1.5Z" />
      <path className="logo-accent-soft" d="m4.5 21-.5 1.5L2.5 25 3 23.5Z" />
      <path className="logo-accent-soft" d="m10.5 25-.5 1.5-2.5 4.5.5-1.5Z" />
      <path className="logo-accent-soft" d="m1.5 26-.5 1.5-.5 1.5L0 27.5Z" />
      <path
        className="logo-text"
        d="M189 2h3v6h6v4h-6v5h-3v-5h-6V8h6V2Z"
      />
      <path
        className="logo-text"
        d="M51 8h8v2.5L67 31.5 61.5 32 58.5 27q-6.7-1.7-8.5 1.5L48.5 32 43 31.5 51 8Zm3 7-2 8h6l-2-5q1-4-2-3Z"
      />
      <path
        className="logo-text"
        d="M70 8h18.5l.5 2.5L77 27.5 89 28l-.5 4H70l1-5.5 10-13-11-.5V8Z"
      />
      <path
        className="logo-text"
        d="M91 8q5.4-1.5 7 1.5l2 12 1.5 1.5L105 8h6v3.5l3 11.5q3.7 1.4 2-4.5L119 8h5.5l.5 1.5L119 30.5l-1.5 1.5q-7.3 2.6-5.5-3.5L108.5 18q-4.1 5.8-4.5 14-5.4 1.5-7-1.5L91 8Z"
      />
      <path
        className="logo-text"
        d="M128 8h15.5l.5 5h-11v5h11v3.5L142.5 23 133 23q-1 3.8 1.5 5h9.5v4H128V8Z"
      />
      <path
        className="logo-text"
        d="M148 8h5.5l.5.5v19.5h10v4H148V8Z"
      />
      <path
        className="logo-text"
        d="M167 8h5.5l.5.5v19.5h10v4h-16V8Z"
      />
      <path
        className="logo-text"
        d="M24.5 13 33 26.5 34 32l-4.5 1L21 20.5v-2Z"
      />
      <path
        className="logo-text"
        d="M17.5 27 21 33 13 32.5 15 28Z"
      />
    </svg>
  );
}
