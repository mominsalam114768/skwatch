import { clearGoogleAuth, updateCurrentSheetIdInFirestore } from './firebase';

const getSheetId = () => {
  const id = localStorage.getItem('my_sheet_id');
  if (!id) {
    // Fallback to original database for existing user
    return '1l9wm2yDDNHEe3Pp1ZYpaoQTAu-TRMIwdMDPv2R8NHGE';
  }
  return id;
};

async function handleFetchResponse(res: Response, context: string) {
  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 401) {
      await clearGoogleAuth();
      throw new Error(`Authentication expired (401). Please log in again. Details: ${errText}`);
    }
    throw new Error(`Failed to ${context}: ${errText}`);
  }
  return res;
}

export async function getSheetData(range: string, accessToken: string) {
  if (!accessToken) throw new Error("No token");
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSheetId()}/values/${range}?valueRenderOption=UNFORMATTED_VALUE`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  await handleFetchResponse(res, `fetch ${range}`);
  const data = await res.json();
  return data.values || [];
}

export async function appendRow(range: string, values: any[][], accessToken: string) {
  if (!accessToken) throw new Error("No token");
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSheetId()}/values/${range}:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  });
  await handleFetchResponse(res, `append ${range}`);
  return await res.json();
}

export async function updateRow(range: string, values: any[][], accessToken: string) {
  if (!accessToken) throw new Error("No token");
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSheetId()}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ range, majorDimension: "ROWS", values })
  });
  await handleFetchResponse(res, `update ${range}`);
  return await res.json();
}

export async function setupSpreadsheet(accessToken: string, providedSheetId?: string) {
  if (!accessToken) throw new Error("No token");
  const sheetIdToUse = providedSheetId || getSheetId();
  if (providedSheetId) {
    localStorage.setItem('my_sheet_id', providedSheetId);
    updateCurrentSheetIdInFirestore(providedSheetId).catch(console.error);
  }

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetIdToUse}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  await handleFetchResponse(res, `get spreadsheet info`);
  const data = await res.json();
  const existingTitles = data.sheets.map((s: any) => s.properties.title);

  const neededSheets = [
    { title: 'Customers', headers: ['id', 'name', 'phone', 'type', 'previous_due', 'current_due'] },
    { title: 'Transactions', headers: ['id', 'customer_id', 'customer_name', 'type', 'amount', 'details', 'date'] },
    { title: 'Stock', headers: ['id', 'product_name', 'unit', 'purchase_qty', 'total_purchase_price', 'current_stock'] },
    { title: 'Cashbox', headers: ['id', 'date', 'type', 'amount'] },
    { title: 'Settings', headers: ['key', 'value'] },
    { title: 'Users', headers: ['email', 'pass', 'role'] }
  ];

  const requests = [];
  for (const sheet of neededSheets) {
    if (!existingTitles.includes(sheet.title)) {
      requests.push({
        addSheet: { properties: { title: sheet.title } }
      });
    }
  }

  if (requests.length > 0) {
    const addRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetIdToUse}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    });
    await handleFetchResponse(addRes, `batch update sheets`).catch(e => console.error(e));
  }

  // After ensuring sheets exist, append the headers if they are empty
  for (const sheet of neededSheets) {
    try {
      const headerRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetIdToUse}/values/${sheet.title}!A1:Z1`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const headerData = await headerRes.json();
      if (!headerData.values || headerData.values.length === 0) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetIdToUse}/values/${sheet.title}!A1:append?valueInputOption=USER_ENTERED`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [sheet.headers] })
        });
      }
    } catch(e) {
      console.error("Error setting headers for", sheet.title, e);
    }
  }
  
  await syncDatabaseToLocal(accessToken);

  return sheetIdToUse;
}

export async function syncDatabaseToLocal(accessToken: string) {
  if (!accessToken) return;
  try {
    const settingsData = await getSheetData('Settings!A2:B', accessToken);
    settingsData.forEach(row => {
      if (row[0] && row[1]) {
        localStorage.setItem(row[0], row[1]);
      }
    });

    const usersData = await getSheetData('Users!A2:C', accessToken);
    const users = usersData.map(row => ({ email: row[0], pass: row[1], role: row[2] }));
    if (users.length > 0) {
      localStorage.setItem('appUsers', JSON.stringify(users));
    }
  } catch (e: any) {
    console.error("Failed to sync from database", e);
    if (e.message && e.message.includes('401')) {
      throw e;
    }
  }
}
export async function pushSettingsToDatabase(accessToken: string) {
  if (!accessToken) return;
  const keys = ['bizName', 'bizAddress', 'bizMobile', 'bizLogo', 'smsApi', 'theme'];
  const values = keys.map(k => [k, localStorage.getItem(k) || '']);
  
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSheetId()}/values/Settings!A2:B?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ range: "Settings!A2:B", majorDimension: "ROWS", values })
  });
  await handleFetchResponse(res, `push settings`);
}

export async function pushUsersToDatabase(accessToken: string) {
  if (!accessToken) return;
  const users = JSON.parse(localStorage.getItem('appUsers') || '[]');
  const values = users.map((u: any) => [u.email, u.pass, u.role]);
  if (values.length === 0) return;

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSheetId()}/values/Users!A2:C?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ range: "Users!A2:C", majorDimension: "ROWS", values })
  });
  await handleFetchResponse(res, `push users`);
}

export async function createNewSpreadsheet(accessToken: string, title: string) {
  if (!accessToken) throw new Error("No token");
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: {
        title: title || 'Store Manager Database'
      }
    })
  });
  await handleFetchResponse(res, `create spreadsheet`);
  const data = await res.json();
  const newSheetId = data.spreadsheetId;
  localStorage.setItem('my_sheet_id', newSheetId);
  updateCurrentSheetIdInFirestore(newSheetId).catch(console.error);
  return newSheetId;
}
