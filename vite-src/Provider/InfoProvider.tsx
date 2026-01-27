import React, { createContext, ReactNode, useState } from 'react'

type InfoContextType = {
  info: any
  setInfo: React.Dispatch<React.SetStateAction<any>>
}

const InfoContext = createContext<InfoContextType | undefined>(undefined)

const InfoProvider = ({ children }: { children?: ReactNode }) => {
  const [info, setInfo] = useState<any>(null)

  return (
    <InfoContext.Provider value={{ info, setInfo }}>
      {children}
    </InfoContext.Provider>
  )
}

export default InfoProvider
export { InfoContext }

