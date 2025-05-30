const AdminControls = ({ exportToCSV, handleImportCSV, handleDeleteEvent, selectedEventId }) => (
  <>
    <div className="flex gap-2">
      <button className="bg-green-600 text-white w-full p-2 rounded" onClick={exportToCSV}>
        Exporteren naar CSV
      </button>
      <label className="bg-gray-200 p-2 rounded cursor-pointer text-center w-full">
        Importeren uit CSV
        <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
      </label>
    </div>
    <div className="flex">
      <button
        className="bg-purple-600 text-white w-full p-2 rounded"
        onClick={() => handleDeleteEvent(selectedEventId)}
      >
        Verwijder huidig event
      </button>
    </div>
  </>
);

export default AdminControls;
