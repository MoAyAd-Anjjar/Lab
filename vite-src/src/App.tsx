import { useState } from 'react'
import MainCard from './Components/MainCard'
import ProcessPatient from './Components/ProcessPatient'
import ViewReports from './Components/ViewReports'
import SearchPatient from './Components/SearchPatient'



const App = () => {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const renderScreen = () => {
    if (selectedId === 1) return <ProcessPatient onBack={() => setSelectedId(null)} />
    if (selectedId === 2) return <ViewReports onBack={() => setSelectedId(null)} />
    if (selectedId === 3) return <SearchPatient onBack={() => setSelectedId(null)} />
    return <MainCard onNavigate={(id) => setSelectedId(id)} />
  }

  return (
    <div style={selectedId === null ? { height: '98vh', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' } : {} }>
      {renderScreen()}
    </div>
  )
}

export default App
