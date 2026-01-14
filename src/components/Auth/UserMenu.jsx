import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function UserMenu({ onOpenAuth }) {
  const { user, isAuthenticated, signOut, loading, isConfigured } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setSigningOut(false);
      setShowMenu(false);
    }
  };

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={onOpenAuth}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        {isConfigured ? 'Sign In' : 'Local Mode'}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
          {user.email?.charAt(0).toUpperCase()}
        </div>
        <span className="text-gray-300 max-w-[120px] truncate hidden sm:block">
          {user.email}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${showMenu ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
            <div className="p-3 border-b border-gray-700">
              <p className="text-sm text-white truncate">{user.email}</p>
              <p className="text-xs text-gray-400">Signed in</p>
            </div>
            <div className="p-1">
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-700 rounded transition-colors"
              >
                {signingOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
