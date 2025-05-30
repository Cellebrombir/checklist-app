const PersonForm = ({ newPerson, setNewPerson, handleAddPerson }) => (
  <div className="flex gap-2">
    <input
      className="border p-2 rounded w-full"
      placeholder="Naam"
      value={newPerson.name}
      onChange={(e) => setNewPerson((p) => ({ ...p, name: e.target.value }))}
    />
    <input
      className="border p-2 rounded w-full"
      placeholder="Email"
      value={newPerson.email}
      onChange={(e) => setNewPerson((p) => ({ ...p, email: e.target.value }))}
    />
    <select
      value={newPerson.timeOfDay}
      onChange={(e) => setNewPerson((p) => ({ ...p, timeOfDay: e.target.value }))}
      className="border border-gray-300 rounded px-2 py-1"
    >
      <option value="" disabled>
        Kies een dagdeel
      </option>
      <option value="Ochtend">Ochtend</option>
      <option value="Middag">Middag</option>
      <option value="Hele dag">Hele dag</option>
    </select>
    <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleAddPerson}>
      Voeg toe
    </button>
  </div>
);

export default PersonForm;
