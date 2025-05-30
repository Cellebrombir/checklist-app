import { useState, useEffect } from "react";
import axios from "axios";
import EventSelector from "./components/EventSelector";
import AdminControls from "./components/AdminControls";
import PersonForm from "./components/PersonForm";
import PeopleList from "./components/PeopleList";

const defaultEventData = { name: "", eventDate: "" };
const defaultPersonData = { name: "", email: "", timeOfDay: "" };

const App = () => {
  const [events, setEvents] = useState([]);
  const [people, setPeople] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [newEvent, setNewEvent] = useState(defaultEventData);
  const [newPerson, setNewPerson] = useState(defaultPersonData);

  const [editingPersonId, setEditingPersonId] = useState(null);
  const [editPersonData, setEditPersonData] = useState(defaultPersonData);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) fetchPeople(selectedEventId);
  }, [selectedEventId]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchEvents();
      if (selectedEventId) fetchPeople(selectedEventId);
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const res = await axios.get("/api/events");
      setEvents(res.data);
      if (res.data.length > 0 && !selectedEventId) {
        setSelectedEventId(res.data[0].id);
      }
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

  const validateDate = (date) => /^\d{2}-\d{2}-\d{4}$/.test(date);

  const handleCreateEvent = async () => {
    const { name, eventDate } = newEvent;
    if (!name.trim() || !validateDate(eventDate.trim())) {
      alert("Kies een juiste naam en datum (dd-mm-yyyy).");
      return;
    }

    try {
      const res = await axios.post("/api/events", {
        name: name.trim(),
        eventDate: eventDate.trim(),
      });
      setEvents((prev) => [...prev, res.data]);
      setSelectedEventId(res.data.id);
      setNewEvent(defaultEventData);
    } catch (err) {
      console.error("Failed to create event:", err);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Verwijder dit event?")) return;
    try {
      await axios.delete(`/api/events/${eventId}`);
      fetchEvents();
      setSelectedEventId(null);
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  const handleAddPerson = async () => {
    const { name, email, timeOfDay } = newPerson;
    if (!name || !email || !timeOfDay || !selectedEventId) return;
    try {
      await axios.post("/api/people", {
        ...newPerson,
        checked: false,
        eventId: selectedEventId,
      });
      setNewPerson(defaultPersonData);
      fetchPeople(selectedEventId);
    } catch (err) {
      console.error("Failed to add person:", err);
    }
  };

  const handleEditPerson = async (id) => {
    try {
      await axios.put(`/api/people/${id}`, {
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

  const handleDeletePerson = async (id) => {
    if (!window.confirm("Verwijder deze person?")) return;
    try {
      await axios.delete(`/api/people/${id}`);
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

    const dateStr = validateDate(event.eventDate)
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

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedEventId) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const lines = event.target.result.trim().split("\n").filter(Boolean);
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

  const toggleAdmin = () => {
    if (!isAdmin) {
      const pwd = prompt("Voer admin wachtwoord in:");
      if (pwd === "admin") setIsAdmin(true);
      else alert("Onjuist wachtwoord.");
    } else {
      setIsAdmin(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <EventSelector
        events={events}
        selectedEventId={selectedEventId}
        setSelectedEventId={setSelectedEventId}
        isAdmin={isAdmin}
        toggleAdmin={toggleAdmin}
        newEvent={newEvent}
        setNewEvent={setNewEvent}
        handleCreateEvent={handleCreateEvent}
      />

      {isAdmin && (
        <AdminControls
          handleImportCSV={handleImportCSV}
          exportToCSV={exportToCSV}
          handleDeleteEvent={handleDeleteEvent}
          selectedEventId={selectedEventId}
        />
      )}

      <PersonForm
        newPerson={newPerson}
        setNewPerson={setNewPerson}
        handleAddPerson={handleAddPerson}
      />

      <PeopleList
        people={people}
        isAdmin={isAdmin}
        editingPersonId={editingPersonId}
        setEditingPersonId={setEditingPersonId}
        editPersonData={editPersonData}
        setEditPersonData={setEditPersonData}
        handleEditPerson={handleEditPerson}
        handleDeletePerson={handleDeletePerson}
        handleCheckToggle={handleCheckToggle}
      />
    </div>
  );
};

export default App;
