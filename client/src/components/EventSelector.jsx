const EventSelector = ({
  events,
  selectedEventId,
  setSelectedEventId,
  isAdmin,
  toggleAdmin,
  newEvent,
  setNewEvent,
  handleCreateEvent,
}) => (
  <div className="flex items-center gap-4 mb-4">
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={isAdmin} onChange={toggleAdmin} />
      Admin modus
    </label>

    <select
      value={selectedEventId || ""}
      onChange={(e) => setSelectedEventId(Number(e.target.value))}
      className="border border-gray-300 rounded px-2 py-1"
    >
      {events.map((event) => (
        <option key={event.id} value={event.id}>
          {`${event.name} (${event.eventDate || ""})`}
        </option>
      ))}
    </select>

    {isAdmin && (
      <>
        <input
          type="text"
          placeholder="Nieuwe event naam"
          value={newEvent.name}
          onChange={(e) => setNewEvent((ev) => ({ ...ev, name: e.target.value }))}
          className="border p-2 rounded w-48"
        />
        <input
          type="text"
          placeholder="Datum (dd-mm-jjjj)"
          value={newEvent.eventDate}
          onChange={(e) => setNewEvent((ev) => ({ ...ev, eventDate: e.target.value }))}
          className="border p-2 rounded w-36"
        />
        <button onClick={handleCreateEvent} className="bg-green-600 text-white px-4 py-2 rounded">
          Maak event aan
        </button>
      </>
    )}
  </div>
);

export default EventSelector;
