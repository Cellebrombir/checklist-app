import PersonItem from "./PersonItem";

const PeopleList = ({
  people,
  isAdmin,
  editingPersonId,
  setEditingPersonId,
  editPersonData,
  setEditPersonData,
  handleEditPerson,
  handleDeletePerson,
  handleCheckToggle,
}) => (
  <ul className="space-y-2">
    {people.map((person, index) => (
      <PersonItem
        key={person.id}
        index={index}
        person={person}
        isAdmin={isAdmin}
        editingPersonId={editingPersonId}
        setEditingPersonId={setEditingPersonId}
        editPersonData={editPersonData}
        setEditPersonData={setEditPersonData}
        handleEditPerson={handleEditPerson}
        handleDeletePerson={handleDeletePerson}
        handleCheckToggle={handleCheckToggle}
      />
    ))}
  </ul>
);

export default PeopleList;
