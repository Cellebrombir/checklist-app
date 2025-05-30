const PersonItem = ({
  index,
  person,
  isAdmin,
  editingPersonId,
  setEditingPersonId,
  editPersonData,
  setEditPersonData,
  handleEditPerson,
  handleDeletePerson,
  handleCheckToggle,
}) => {
  const isEditing = editingPersonId === person.id;

  return (
    <li className="flex justify-between items-center border p-2 rounded shadow-sm">
      {isEditing ? (
        <div className="flex gap-2 w-full">
          <input
            value={editPersonData.name}
            onChange={(e) => setEditPersonData((p) => ({ ...p, name: e.target.value }))}
            className="border p-1 rounded w-full"
          />
          <input
            value={editPersonData.email}
            onChange={(e) => setEditPersonData((p) => ({ ...p, email: e.target.value }))}
            className="border p-1 rounded w-full"
          />
          <select
            value={editPersonData.timeOfDay}
            onChange={(e) => setEditPersonData((p) => ({ ...p, timeOfDay: e.target.value }))}
            className="border p-1 rounded"
          >
            <option value="Ochtend">Ochtend</option>
            <option value="Middag">Middag</option>
            <option value="Hele dag">Hele dag</option>
          </select>
          <button
            onClick={() => handleEditPerson(person.id)}
            className="bg-green-600 text-white px-2 rounded"
          >
            Opslaan
          </button>
        </div>
      ) : (
        <>
          <div>
            <p className="font-semibold">{person.name}</p>
            <p className="text-sm">{person.email}</p>
            <p className="text-sm">{person.timeOfDay}</p>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={person.checked}
              onChange={() => handleCheckToggle(index)}
            />
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setEditingPersonId(person.id);
                    setEditPersonData({
                      name: person.name,
                      email: person.email,
                      timeOfDay: person.timeOfDay,
                    });
                  }}
                  className="text-yellow-600 text-sm"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDeletePerson(person.id)}
                  className="text-red-600 text-sm"
                >
                  ❌
                </button>
              </>
            )}
          </div>
        </>
      )}
    </li>
  );
};

export default PersonItem;
