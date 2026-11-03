"use client";

import { useState } from "react";
import { METHODS } from "@/lib/constants";
import { CARD_METHODS } from "@/lib/constants";

type Machine = { id: string; name: string };

/** Forma de recebimento + maquininha (só aparece para cartão/Pix). */
export function PayFields({
  methods,
  machines,
  defaultMethod,
  defaultMachineId,
}: {
  methods: (keyof typeof METHODS)[];
  machines: Machine[];
  defaultMethod: keyof typeof METHODS;
  defaultMachineId?: string | null;
}) {
  const [method, setMethod] = useState<string>(defaultMethod);
  const needsMachine = (CARD_METHODS.includes(method) || method === "PIX") && machines.length > 0;

  return (
    <>
      <div>
        <label className="label">Forma de recebimento</label>
        <select name="method" className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
          {methods.map((m) => (
            <option key={m} value={m}>{METHODS[m]}</option>
          ))}
        </select>
      </div>
      {needsMachine && (
        <div>
          <label className="label">Maquininha</label>
          <select name="machineId" className="input" defaultValue={defaultMachineId === undefined ? machines[0].id : (defaultMachineId ?? "")}>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
            {method === "PIX" && <option value="">Pix direto (sem taxa)</option>}
          </select>
        </div>
      )}
    </>
  );
}
