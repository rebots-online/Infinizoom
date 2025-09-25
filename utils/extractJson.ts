/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export const extractJson = <T>(text: string) => {
  try {
    const data = JSON.parse(text) as T;
    return data;
  } catch {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/s);
    if (!match) {
      throw new Error(`No JSON found in response: ${text}`);
    }
    try {
      const data = JSON.parse(match[1]) as T;

      return data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
};
