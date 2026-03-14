/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Tasks } from './Tasks';

// We reuse the Tasks component but set it to the team tab
export const Team: React.FC = () => {
  return <Tasks initialTab="team" />;
};
