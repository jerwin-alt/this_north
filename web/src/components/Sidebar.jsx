// src/components/Sidebar.jsx

export default function Sidebar() {
  // Example: Get the user from your existing auth context or localStorage
  // Replace this with however you currently get the logged-in user
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  return (
    <aside className="w-64 bg-gray-900 text-white ...">
      {/* ... Other navigation links ... */}
      
      {/* Only show Recycle Bin if the user is an admin */}
      {user && user.role === 'admin' && (
        <NavLink 
          to="/admin/recycle-bin" 
          className="flex items-center p-3 hover:bg-gray-800"
        >
          <TrashIcon className="w-5 h-5 mr-3" />
          Recycle Bin
        </NavLink>
      )}
    </aside>
  );
}