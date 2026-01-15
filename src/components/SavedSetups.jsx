import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserSimulations,
  saveSimulation,
  deleteSimulation,
  simulationToState,
} from '../lib/supabase';

/**
 * SavedSetups - Dropdown for managing saved simulation setups
 * Only visible when user is logged in
 */
export default function SavedSetups({ currentState, onLoadSetup }) {
  const { user } = useAuth();
  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load setups when user logs in
  useEffect(() => {
    if (user) {
      loadSetups();
    } else {
      setSetups([]);
    }
  }, [user]);

  const loadSetups = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserSimulations(user.id);
      setSetups(data);
    } catch (err) {
      console.error('Failed to load setups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !newName.trim()) return;

    setSaving(true);
    setError(null);
    try {
      await saveSimulation(user.id, newName.trim(), currentState);
      await loadSetups();
      setShowSaveDialog(false);
      setNewName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async (setup) => {
    const state = simulationToState(setup);
    if (state) {
      onLoadSetup(state);
      setShowDropdown(false);
    }
  };

  const handleDelete = async (name, e) => {
    e.stopPropagation();
    if (!user) return;
    if (!confirm(`Delete setup "${name}"?`)) return;

    try {
      await deleteSimulation(user.id, name);
      await loadSetups();
    } catch (err) {
      console.error('Failed to delete setup:', err);
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
      >
        <span>📁</span>
        <span>Setups</span>
        <span className="text-xs text-gray-400">({setups.length})</span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-3 border-b border-gray-700">
            <h4 className="font-semibold text-sm">Saved Setups</h4>
          </div>

          {/* Save current button */}
          <div className="p-2 border-b border-gray-700">
            <button
              onClick={() => setShowSaveDialog(true)}
              className="w-full px-3 py-2 text-sm bg-purple-600 hover:bg-purple-500 rounded transition-colors"
            >
              Save Current Setup
            </button>
          </div>

          {/* Setups list */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
            ) : setups.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">No saved setups yet</div>
            ) : (
              setups.map((setup) => (
                <div
                  key={setup.id}
                  onClick={() => handleLoad(setup)}
                  className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center justify-between group"
                >
                  <div>
                    <div className="text-sm font-medium">{setup.name}</div>
                    <div className="text-xs text-gray-400">
                      {setup.symbol || 'Custom'} • ${setup.current_price} • {setup.is_call ? 'Call' : 'Put'}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(setup.name, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-opacity"
                    title="Delete setup"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t border-gray-700">
            <button
              onClick={() => setShowDropdown(false)}
              className="w-full px-3 py-1 text-sm text-gray-400 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-4 w-80">
            <h4 className="text-lg font-semibold mb-4">Save Setup</h4>

            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Setup name..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded mb-2 focus:outline-none focus:border-purple-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />

            {error && (
              <p className="text-red-400 text-xs mb-2">{error}</p>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !newName.trim()}
                className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
