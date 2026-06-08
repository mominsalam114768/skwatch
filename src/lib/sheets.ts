const getSheetId = () => {
  const id = localStorage.getItem('my_sheet_id');
  if (!id) {
    // Fallback to original database for existing user
    return '1l9wm2yDDNHEe3Pp1ZYpaoQTAu-TRMIwdMDPv2R8NHGE';
  }
  return id;
};

export async function getSheetData(range: string, accessToken: string) {
  if (!accessToken) throw new Error("No token");
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSheetId()}/values/${range}?valueRenderOption=UNFORMATTED_VALUE`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch ${range}: ${err}`);
  }
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
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to append ${range}: ${err}`);
  }
  return await res.json();
}

export async function updateRow(range: string, values: any[][], accessToken: string) {
  if (!accessToken) throw new Error("No token");
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSheetId()}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update ${range}: ${err}`);
  }
  return await res.json();
}

export async function setupSpreadsheet(accessToken: string, providedSheetId?: string) {
  if (!accessToken) throw new Error("No token");
  const sheetIdToUse = providedSheetId || getSheetId();
  if (providedSheetId) {
    localStorage.setItem('my_sheet_id', providedSheetId);
  }

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetIdToUse}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error("Failed to get spreadsheet info");
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
    if (!addRes.ok) {
      console.error("Failed to batch update sheets");
    }
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
  } catch (e) {
    console.error("Failed to sync from database", e);
  }
}
export async function pushSettingsToDatabase(accessToken: string) {
  if (!accessToken) return;
  const keys = ['bizName', 'bizAddress', 'bizMobile', 'bizLogo', 'smsApi', 'theme'];
  const values = keys.map(k => [k, localStorage.getItem(k) || '']);
  
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSheetId()}/values/Settings!A2:B?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values })
    });
    if (!res.ok) console.error("Failed to push settings", await res.text());
  } catch (e) {
    console.error(e);
  }
}

export async function pushUsersToDatabase(accessToken: string) {
  if (!accessToken) return;
  const users = JSON.parse(localStorage.getItem('appUsers') || '[]');
  const values = users.map((u: any) => [u.email, u.pass, u.role]);
  if (values.length === 0) return;

  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSheetId()}/values/Users!A2:C?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values })
    });
    if (!res.ok) console.error("Failed to push users", await res.text());
  } catch (e) {
    console.error(e);
  }
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
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create spreadsheet: ${err}`);
  }
  const data = await res.json();
  const newSheetId = data.spreadsheetId;
  localStorage.setItem('my_sheet_id', newSheetId);
  return newSheetId;
}
