import React, { useState, useEffect } from "react";
import axios from "axios";

const App = () => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [people, setPeople] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [editingPersonId, setEditingPersonId] = useState(null);

  const [editEventData, setEditEventData] = useState({ name: "", eventDate: "" });
  const [editPersonData, setEditPersonData] = useState({ name: "", email: "", timeOfDay: "" });

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId !== null) {
      fetchPeople(selectedEventId);
    }
  }, [selectedEventId]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchEvents();
      if (selectedEventId !== null) {
        fetchPeople(selectedEventId);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const res = await axios.get("/api/events");
      setEvents(res.data);
      if (res.data.length > 0) setSelectedEventId(res.data[0].id);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
  };

  const fetchPeople = async (eventId) => {
    try {
      const res = await axios.get("/api/people", { params: { eventId } });
      setPeople(res.data);
    } catch (err) {
      console.error("Failed to fetch people:", err);
    }
  };

  const handleCreateEvent = async () => {
    const trimmedName = newEventName.trim();
    const trimmedDate = newEventDate.trim();

    if (!trimmedName || !trimmedDate || !/^\d{2}-\d{2}-\d{4}$/.test(trimmedDate)) {
      alert("Enter valid name and date (dd-mm-yyyy).");
      return;
    }

    try {
      const res = await axios.post("/api/events", {
        name: trimmedName,
        eventDate: trimmedDate,
      });
      setEvents((prev) => [...prev, res.data]);
      setSelectedEventId(res.data.id);
      setNewEventName("");
      setNewEventDate("");
    } catch (err) {
      console.error("Failed to create event:", err);
    }
  };

  const handleEditEvent = async (eventId) => {
    try {
      await axios.put(`/api/events/${eventId}`, editEventData);
      setEditingEventId(null);
      fetchEvents();
    } catch (err) {
      console.error("Failed to edit event:", err);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await axios.delete(`/api/events/${eventId}`);
      fetchEvents();
      setSelectedEventId(null);
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  const handleAddPerson = async () => {
    if (!name || !email || !timeOfDay || !selectedEventId) return;
    try {
      await axios.post("/api/people", {
        name,
        email,
        timeOfDay,
        checked: false,
        eventId: selectedEventId,
      });
      setName("");
      setEmail("");
      setTimeOfDay("");
      fetchPeople(selectedEventId);
    } catch (err) {
      console.error("Failed to add person:", err);
    }
  };

  const handleEditPerson = async (personId) => {
    try {
      await axios.put(`/api/people/${personId}`, {
        ...editPersonData,
        checked: false,
        eventId: selectedEventId,
      });
      setEditingPersonId(null);
      fetchPeople(selectedEventId);
    } catch (err) {
      console.error("Failed to edit person:", err);
    }
  };

  const handleDeletePerson = async (personId) => {
    if (!window.confirm("Delete this person?")) return;
    try {
      await axios.delete(`/api/people/${personId}`);
      fetchPeople(selectedEventId);
    } catch (err) {
      console.error("Failed to delete person:", err);
    }
  };

  const handleCheckToggle = async (index) => {
    const person = people[index];
    try {
      await axios.put(`/api/people/${person.id}`, {
        ...person,
        checked: !person.checked,
        eventId: selectedEventId,
      });
      fetchPeople(selectedEventId);
    } catch (err) {
      console.error("Failed to toggle checked:", err);
    }
  };

  const exportToCSV = () => {
    const event = events.find((e) => e.id === selectedEventId);
    if (!event) return;

    const csvRows = ["Naam,Email,Dagdeel,Aanwezig"];
    people.forEach(({ name, email, timeOfDay, checked }) =>
      csvRows.push(`${name},${email},${timeOfDay},${checked}`)
    );

    const dateStr = /^\d{2}-\d{2}-\d{4}$/.test(event.eventDate)
      ? event.eventDate
      : new Date().toLocaleDateString("nl-NL").replace(/\//g, "-");

    const filename = `${event.name.replace(/[^a-z0-9]/gi, "_")}_${dateStr}.csv`;

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedEventId) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.trim().split("\n").filter(Boolean);
      const [, ...rows] = lines;

      const people = rows.map((line) => {
        const [name, email, timeOfDay, checked] = line.split(";").map((c) => c.trim());
        return { name, email, timeOfDay, checked: checked.toLowerCase() === "true" };
      });

      try {
        await axios.post("/api/people/import", { people, eventId: selectedEventId });
        fetchPeople(selectedEventId);
      } catch (err) {
        console.error("Import failed:", err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={() => {
              if (!isAdmin) {
                const pwd = prompt("Voer admin wachtwoord in:");
                if (pwd === "admin") {
                  setIsAdmin(true);
                } else {
                  alert("Onjuist wachtwoord.");
                }
              } else {
                setIsAdmin(false);
              }
            }}
          />
          Admin modus
        </label>

        <select
          value={selectedEventId || ""}
          onChange={(e) => setSelectedEventId(Number(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1"
        >
          {events.map((event) =>
            editingEventId === event.id ? (
              <option key={event.id} value={event.id}>
                ✏️ Bewerken...
              </option>
            ) : (
              <option key={event.id} value={event.id}>
                {event.name} {event.eventDate ? `(${event.eventDate})` : ""}
              </option>
            )
          )}
        </select>

        {isAdmin && (
          <>
            <input
              type="text"
              placeholder="Nieuwe event naam"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              className="border p-2 rounded w-48"
            />
            <input
              type="text"
              placeholder="Datum (dd-mm-jjjj)"
              value={newEventDate}
              onChange={(e) => setNewEventDate(e.target.value)}
              className="border p-2 rounded w-36"
            />
            <button
              onClick={handleCreateEvent}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Maak event aan
            </button>
          </>
        )}

      </div>

        {isAdmin && (
          <div className="flex gap-2">
            <button
              className="bg-green-600 text-white w-full p-2 rounded"
              onClick={exportToCSV}
            >
              Exporteren naar CSV
            </button>
            <label className="bg-gray-200 p-2 rounded cursor-pointer text-center w-full">
              Importeren uit CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
              />
            </label>
          </div>
        )}
        
        {isAdmin && (
          <div className="flex">
            <button
              className="bg-purple-600 text-white w-full p-2 rounded"
              onClick={() => handleDeleteEvent(selectedEventId)}
            >
              Verwijder huidig event
            </button>
          </div>
        )}
        
      {/* People list and input */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            className="border p-2 rounded w-full"
            placeholder="Naam"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="border p-2 rounded w-full"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value="" disabled>Kies een dagdeel</option>
            <option value="Ochtend">Ochtend</option>
            <option value="Middag">Middag</option>
            <option value="Hele dag">Hele dag</option>
          </select>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={handleAddPerson}
          >
            Voeg toe
          </button>
        </div>

        <ul className="space-y-2">
          {people.map((person) => (
            <li
              key={person.id}
              className="flex justify-between items-center border p-2 rounded shadow-sm"
            >
              {editingPersonId === person.id ? (
                <div className="flex gap-2 w-full">
                  <input
                    value={editPersonData.name}
                    onChange={(e) =>
                      setEditPersonData((p) => ({ ...p, name: e.target.value }))
                    }
                    className="border p-1 rounded w-full"
                  />
                  <input
                    value={editPersonData.email}
                    onChange={(e) =>
                      setEditPersonData((p) => ({ ...p, email: e.target.value }))
                    }
                    className="border p-1 rounded w-full"
                  />
                  <select
                    value={editPersonData.timeOfDay}
                    onChange={(e) =>
                      setEditPersonData((p) => ({ ...p, timeOfDay: e.target.value }))
                    }
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
                    Save
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
                      onChange={() => handleCheckToggle(people.indexOf(person))}
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
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;
