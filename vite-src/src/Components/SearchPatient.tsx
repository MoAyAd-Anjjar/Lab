import * as Neutralino from '@neutralinojs/lib';

const SearchPatient = ({ onBack }: { onBack: () => void }) => {

  // Get path to db.js dynamically
  const getDbScriptPath = async () => {
    const info = await Neutralino.app.getConfig();
    // resourcesPath points to the 'resources' folder
    console.log(info);
    
    return `${info.documentRoot}backend/db.js`;
  };

  const addPatient = async () => {
    const dbPath = await getDbScriptPath();
    console.log('DB Script Path:', dbPath);

    await Neutralino.os.execCommand(
      `node "${dbPath}" add "Ali" 25`
    );

    alert('Saved');
  };

  const loadPatients = async () => {
    const dbPath = await getDbScriptPath();

    const result = await Neutralino.os.execCommand(
      `node "${dbPath}" list`
    );

    const patients = JSON.parse(result.stdOut);
    console.log('Patients:', patients);
  };

  return (
    <div>
      <button onClick={onBack}>Back</button>
      <button onClick={addPatient}>Add</button>
      <button onClick={loadPatients}>Load</button>
    </div>
  );
};

export default SearchPatient;
