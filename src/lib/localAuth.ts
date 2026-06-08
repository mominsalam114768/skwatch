export interface AppUser {
  email: string;
  pass: string;
  role: 'admin' | 'user';
}

export const initLocalAuth = () => {
  const users = localStorage.getItem('appUsers');
  if (!users) {
    localStorage.setItem('appUsers', JSON.stringify([
      { email: 'mominkhan051220@gmail.com', pass: 'momin1234', role: 'admin' }
    ]));
  }
};

export const getLoggedInUser = (): AppUser | null => {
  const u = localStorage.getItem('loggedInUser');
  return u ? JSON.parse(u) : null;
};

export const loginUser = (email: string, pass: string): AppUser | null => {
  const users: AppUser[] = JSON.parse(localStorage.getItem('appUsers') || '[]');
  const user = users.find(u => u.email === email && u.pass === pass);
  if (user) {
    localStorage.setItem('loggedInUser', JSON.stringify(user));
    return user;
  }
  return null;
};

export const logoutUser = () => {
  localStorage.removeItem('loggedInUser');
};

export const getUsers = (): AppUser[] => {
  return JSON.parse(localStorage.getItem('appUsers') || '[]');
};

export const deleteUser = (email: string) => {
  const users: AppUser[] = JSON.parse(localStorage.getItem('appUsers') || '[]');
  const newUsers = users.filter(u => u.email !== email);
  localStorage.setItem('appUsers', JSON.stringify(newUsers));
};

export const createSubUser = (email: string, pass: string) => {
  const users: AppUser[] = JSON.parse(localStorage.getItem('appUsers') || '[]');
  if (users.find(u => u.email === email)) {
    throw new Error('এই ইমেইলটি আগে থেকেই ব্যবহৃত হচ্ছে!');
  }
  users.push({ email, pass, role: 'user' });
  localStorage.setItem('appUsers', JSON.stringify(users));
};
